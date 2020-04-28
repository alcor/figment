function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index')
  //template.ladder = e.parameter.ladder || "default";
  return template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function test() {
  Logger.log(figmainfo("https://www.figma.com/file/aTdiAlDwv5wdOcLGiwKUIM/IA-Convergence-2020?node-id=335%3A152421"))
}


function figmainfos(urls) {


}

function figmainfo(url) {
  var scriptProperties = PropertiesService.getScriptProperties();
  // curl -H 'X-FIGMA-TOKEN: <personal access token>' ''
  // GET/v1/files/:key/comments
  var re = /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
  var match = url.match(re)
  Logger.log(match);
  
  if (!match) return;
  var key = match[3];
  var id = undefined;
  var infoUrl = "https://api.figma.com/v1/files/" + key + "?depth=1";
  Logger.log(infoUrl);
  var response = UrlFetchApp.fetch(infoUrl, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("token")}});
  var json = response.getContentText();
  var data = JSON.parse(json);
Logger.log(data.title);
  var canvases = 
  Logger.log(data.name);
  var array = [[data.name, data.thumbnailUrl, data.lastModified]]
  return array;
  
  
}

var GALLERY_CACHE = "GALLERY_CACHE"
function getData(ignoreCache) {
  var cache = CacheService.getScriptCache();
  if (!ignoreCache && (cached = cache.get(GALLERY_CACHE)) != null) {    
    return cached; 
  }
  
  var ss = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1kYm8Xi5NRnPaLWvPfy4ERHQyCT2iGJZbw9kyNe5aICQ/');
  
  var sheet = ss.getSheetByName("Site Data");
  if (sheet == undefined) return JSON.stringify({"error": "not found"});

  var galleryData = sheet.getDataRange().getValues();
  var response = JSON.stringify({
    data: galleryData,
  });
  
  Logger.log(response);
  cache.put(GALLERY_CACHE, response, 600)
  return response; 
}

function testData() {
  Logger.log(getData())
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}