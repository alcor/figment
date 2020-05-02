function doGet(e) {
  var template = HtmlService.createTemplateFromFile('gas/index')
  var output = template.evaluate();
  return output
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

function test() {
  Logger.log(figmainfo("https://www.figma.com/file/aTdiAlDwv5wdOcLGiwKUIM/IA-Convergence-2020?node-id=335%3A152421"))
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
  var array = [[data.name, data.thumbnailUrl, data.lastModified]]
  return array;  
}

function testweb() {
  webinfo("https://www.figma.com/file/aTdiAlDwv5wdOcLGiwKUIM/IA-Convergence-2020?node-id=1878%3A64885");
}

function webinfo(url) {
  Logger.log(url)
}


function testuser() {
  Logger.log(getUserInfo("nj@dropbox.com"));
}

function getUserInfo(email) {
  var user = AdminDirectory.Users.get(email, {viewType:'domain_public'});
  Logger.log('User data:\n %s', JSON.stringify(user, null, 2));
  return user;
}

var GALLERY_CACHE = "GALLERY_CACHE"

function getData(ignoreCache) {
  var cache = CacheService.getScriptCache();
  if (!ignoreCache && (cached = cache.get(GALLERY_CACHE)) != null) {    
    return cached; 
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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

function addData(row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Gallery");
  if (sheet == undefined) return JSON.stringify({"error": "not found"});
  var timestamp = Utilities.formatDate(new Date(), "PST", "yyyy-MM-dd HH:mm:ss");
  row.unshift(timestamp);
  
  var user = getUserInfo(row[1]);
  row.push(user.name.fullName);
  row.push(user.thumbnailPhotoUrl);
  sheet.appendRow(row);
}

function testData() {
  Logger.log(getData())
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getUser(email) {
  var user = AdminDirectory.Users.get(email, {viewType:'domain_public'});
  Logger.log(user);
  return user;
}

//function getAuthorData(username) {
//  var url = "https://app.dropboxer.net/dropabout/api/dropboxer/drew@dropbox.com";
//  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
//  Logger.log(response); 
//  return response;
//}