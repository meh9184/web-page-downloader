'use strict';
let pages;
let globalIndex;
let terminalIndex;
let isDownload;

chrome.runtime.onMessage.addListener(messageReceived);

async function messageReceived(msg) {
    // Django 서버에 500개 Page List 정보 요청
    $.ajax({
        type: "GET",
        url: "http://localhost:8000/getRandomList",
        dataType: "json"
    }).fail(function(){
        console.log('GET 실패!!');
    }).done(function(data, status, xhr) {
        pages = JSON.parse(data.randomList);

        //startDownloadPages(start, end, numberOfTabs)
        isDownload = 'false';
        startDownloadPages(1, 10, 3);

    });

}

function startDownloadPages(start, end, numberOfTabs){
    globalIndex = start-1;
    terminalIndex = end-1;

    for(let i = 0; i < numberOfTabs; i++) {
        chrome.tabs.create({}, function (tab) {
            moveNextPage(tab);
        });
    }
}

function moveNextPage(tab) {
    let page;
    if(globalIndex <= terminalIndex)
        page = pages[globalIndex++];
    else {
        chrome.tabs.remove(tab.id);
        return;
    }

    chrome.tabs.update(tab.id,{
        url: page.fields.page_url
    },function() {
        chrome.tabs.onUpdated.addListener(function func(tabId, changeInfo) {
            if (tabId == tab.id && changeInfo.status == 'complete') {
                chrome.tabs.onUpdated.removeListener(func);

                // Save Page
                chrome.pageCapture.saveAsMHTML({tabId: tabId}, function (blob) {
                    chrome.cookies.get({'url':'http://localhost:8000', 'name':'csrftoken'}, function(cookie){

                        let formData = new FormData();
                        formData.append('page_number', page.pk);
                        formData.append('page_url', page.fields.page_url);
                        formData.append('site_name', page.fields.site_name);
                        formData.append('site_description', page.fields.site_description);
                        formData.append('menu_xpath', null);
                        formData.append('menu_amount', null);
                        formData.append('mht_file', blob);
                        formData.append('isDownload', isDownload);

                        let headers = [];
                        headers['X-CSRFToken'] = cookie.value;
                        $.ajax({
                            type: "POST",
                            headers: headers,
                            url: "http://localhost:8000/setPage",
                            xhrFields: {
                                withCredentials: true
                            },
                            crossDomain: true,
                            processData: false,
                            contentType: false,
                            data: formData
                        }).fail(function(data){
                            console.log('POST 실패!!');
                        }).done(function(data, status, xhr) {
                            console.log('[TAB  ID ] '+tab.id);
                            console.log('[PAGE NO ] '+page.pk);
                            console.log('[PAGE URL] '+page.fields.page_url);
                            console.log(`[PAGE${page.pk} DOWNLOAD COMPLETE] `);
                            console.log('\n');

                            moveNextPage(tab);
                        });
                    })
                });
            }
        });
    });
}