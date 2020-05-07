var scriptProperties = PropertiesService.getScriptProperties();

function doGet(e) {
  var parameters = e.parameters;
  var output;
  if (parameters.preview) {
    var template = HtmlService.createTemplateFromFile('gas/preview')
    var scriptProperties = PropertiesService.getScriptProperties();
    template.url = parameters.preview[0];
    template.info = getFigmaInfo(parameters.preview[0]);
    output = template.evaluate();
  
  } else {
    var template = HtmlService.createTemplateFromFile('gas/index')
    var scriptProperties = PropertiesService.getScriptProperties();
    template.slack_team = scriptProperties.getProperty("slack_team");
    output = template.evaluate();
  
  }
  
  return output
    .setTitle("Figment")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

function getUrlParameter(name, url) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(url);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function getFigmaFramePreview(url) {
  var re = /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
  var match = url.match(re)
  var key = match[3];
  var ids = getUrlParameter("node-id", url)
  var infoUrl = "https://api.figma.com/v1/images/" + key + (ids ? "?ids=" + ids : "");
  Logger.log(infoUrl)
  var response = JSON.parse(UrlFetchApp.fetch(infoUrl, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("figma_token")}}));

  Logger.log(response)
  return response.images[ids]
}

function testFramePreview() {
  Logger.log(getFigmaFramePreview("https://www.figma.com/file/aTdiAlDwv5wdOcLGiwKUIM/IA-Convergence-2020?node-id=335%3A152421"))
}

function getFigmaInfo(url) {
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
  var response = UrlFetchApp.fetch(infoUrl, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("figma_token")}});
  var json = response.getContentText();
  var data = JSON.parse(json);
  
  return data;
}

function testweb() {
  webinfo("https://www.figma.com/file/aTdiAlDwv5wdOcLGiwKUIM/IA-Convergence-2020?node-id=1878%3A64885");
}

function webinfo(url) {
  Logger.log(url)
}


function testuser() {
  Logger.log(getUserInfo(""));
}

function getUserInfo(email) {
  var user = AdminDirectory.Users.get(email, {viewType:'domain_public'});
  Logger.log('User data:\n %s', JSON.stringify(user, null, 2));
  return user;
}

var GALLERY_CACHE = "GALLERY_CACHE"

function getSpreadsheet() {
var url = scriptProperties.getProperty("sheet_url");
if (url) return SpreadsheetApp.openByUrl(url);
return SpreadsheetApp.getActiveSpreadsheet();
}


function getData(ignoreCache) {
  var cache = CacheService.getScriptCache();
  if (!ignoreCache && (cached = cache.get(GALLERY_CACHE)) != null) {    
    return cached; 
  }
  
  var ss = getSpreadsheet();
  var sheet = ss.getSheets()[0];
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
  var ss = getSpreadsheet();
  var sheet = ss.getSheets()[0];
  if (sheet == undefined) return JSON.stringify({"error": "not found"});
  var timestamp = Utilities.formatDate(new Date(), "PST", "yyyy-MM-dd HH:mm:ss");
  
  var email = row[0];
  var url = row[1];
  row.unshift(timestamp);  
  
  var info = getFigmaInfo(url);
  row.push(info.name, info.thumbnailUrl, info.lastModified)
  
  try {
  row.push(getFigmaFramePreview(url));
  } catch(e) {
  row.push("");
  }
  var user = getUserInfo(email);
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