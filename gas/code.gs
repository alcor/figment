//
// Figment 1.0.1
//
// see https://github.com/alcor/figment/ for information on
// initial setup and how to update this script to the latest version 
//

var scriptProperties = PropertiesService.getScriptProperties();
var sheetURL = scriptProperties.getProperty("sheet_url");
if (sheetURL) SpreadsheetApp.setActiveSpreadsheet(SpreadsheetApp.openByUrl(url));

function getLatestFigmentData() { return getLatestFigmentData_(); }

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Figment')
    .addItem('Get Latest Figment Data', 'getLatestFigmentData')
    .addItem('Create Figment Sheets', 'initialSetup_')
    .addToUi();
}

function doGet(e) {
  var parameters = e.parameters;
  var output;
  if (parameters.preview) { // Render image preview only
    var template = HtmlService.createTemplateFromFile('gas/preview')
    var scriptProperties = PropertiesService.getScriptProperties();
    template.url = parameters.preview[0];
    template.thumbnailUrl = getFigmaFramePreview_(parameters.preview[0]);
    output = template.evaluate();
  } else { // Render home screen
    var template = HtmlService.createTemplateFromFile('gas/index')
    var scriptProperties = PropertiesService.getScriptProperties();
    template.slack_team = scriptProperties.getProperty("slack_team");
    output = template.evaluate();
  }
  
  return output
    .setTitle("Figment")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl("https://raw.githubusercontent.com/alcor/figment/master/img/favicon.png")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

function getSheet_(name, creationCallback) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet();
    sheet.setName(name);
    sheet.setFrozenRows(1);
    if (creationCallback) creationCallback(sheet);
  }
  return sheet;
}

var LAST_UPDATE_KEY = "Last Update";
var fileColumns = ["Key", "Title", "Modified", "Thumbnail", "Team", "Project", LAST_UPDATE_KEY, "Color", "Preview", "Author", "Avatar", "Favorites", "Opens", "Relevance"]
var fileKeys = fileColumns.reduce((a,b,i) => (a[b]=Math.floor(i),a),{});

function initialSetup_() {
  createAllSheets_();
}

function createAllSheets_() {
  getSourcesSheet_();
  getFilesSheet_();
  getDataSheet_();
}

function getDataSheet_() {
  return getSheet_("Data", sheet => {
    var range = sheet.getRange(1, 1);
    range.setValue('=query(Files!A:AL,"select * order by C desc LIMIT 120", 1)')
  });
}

function getFilesSheet_() {
  return getSheet_("Files", sheet => {
    sheet.appendRow(fileColumns)
  });
}

function getSourcesSheet_() {
  return getSheet_("Sources", sheet => {
    sheet.appendRow(["Link to Team, Project, or File", "Timestamp", "File Count"])
    sheet.setColumnWidth(1, 400);
  });
}


// Update the list of sources, fetching latest files from each
function updateSources_() {
  var sourcesSheet = getSourcesSheet_();
  var sourceData = sourcesSheet.getDataRange().getValues();

  var re = /https:\/\/www.figma.com\/(?:files\/\d+\/)?(team|project|file)\/([^\/]+)\/.*/  
  var filesSheet = getFilesSheet_()
  var keys = filesSheet.getRange("A:A").getValues();
  keys = keys.map(k => k[0]);
  
  var today = new Date()
  var priorDate = new Date().setDate(today.getDate() - 31)
  
  for ( i = 1 ; i < sourceData.length; i++){
    var count = 0;
    var url = sourceData[i][0];
    if (!url.length) break;
    var date = today.toISOString(); //row[3];
    var match = re.exec(url);
    var type = match[1];
    var id = match[2];
    
    var fileRows = []
    var projects = [];
    var teamName = "";
    if (type == "team") {
      var results = getFigmaProjects_(id);
      teamName = results.name;
      projects = results.projects.map(p => p.id)
    } else if (type == "project") {
      projects.push(id)
    } if (type == "file") {
      var f = callFigmaAPI_("https://api.figma.com/v1/files/" + id + "?depth=1");
      fileRows.push([f.key, f.name, f.last_modified, f.thumbnail_url]);
      continue;
    }
    
    projects.forEach(p => { 
      var data = getFigmaFiles_(p)
      var projectName = data.name;
        data.files.forEach(f => {
          var dateModified = new Date(f.last_modified);
          if (dateModified > priorDate) {          
            var newRow = [f.key, f.name, f.last_modified, f.thumbnail_url, teamName, projectName];
            fileRows.push(newRow);
          }
        });
    }); 
    
    fileRows.forEach(fileRow => {
      var i = keys.indexOf(fileRow[0]); // Match key and reuse row
      if (i < 0) {
        i = filesSheet.getLastRow();
      } 
      filesSheet.getRange(i + 1, 1, 1, fileRow.length).setValues([fileRow])
      count++;
    })
 
    sourcesSheet.getRange(i + 1, 2).setValue(date);
    sourcesSheet.getRange(i + 1, 3).setValue(count);
  }
  
  filesSheet.sort(3, false);
}

function getLatestFigmentData_() {
  updateSources_();
  updateFiles_();
  updateCache_();
}

function updateCache_() {  
  var data = getData(true)
  try {
    cache.put(FIGMENT_CACHE, data, 60);
  } catch(e) {
    Logger.log(e);
  }
}

function updateFiles_() {
  var filesSheet = getFilesSheet_();
  var filesData = filesSheet.getDataRange().getValues();
  var keys = filesData.map(k => k[0]);
  for (var i = 1; i < filesData.length; i++) {  
    updateFile_(filesData[i], i, filesSheet);
    SpreadsheetApp.flush();
  }
}
function updateFile_(file, i, filesSheet) {
  var key = file[0];
  var updated = file[2];
  var metadataUpdated  = file[fileKeys[LAST_UPDATE_KEY]]
  
  if (!metadataUpdated.length ||  updated > metadataUpdated) {
    Logger.log("Updating " + key);
    try {
      var metadata = [updated]
      metadata = metadata.concat(getFramePreviews_(key))
      metadata = metadata.concat(getVersions_(key))
      filesSheet.getRange(i + 1, fileKeys[LAST_UPDATE_KEY] + 1, 1, metadata.length).setValues([metadata])
    }  catch (e) {
      filesSheet.getRange(i + 1, 14, 1, 1).setValues([[JSON.stringify(e)]])
    }
  }
}

function incrementAttributeValue(key, attribute, change) {
  var filesSheet = getFilesSheet_();
  var filesData = filesSheet.getDataRange().getValues();
  
  var column;
  for (var i = 0; i < filesData[0].length; i++) {
    if (filesData[0][i] == attribute) {
      column = i;
      break;
    }
  }
  for (var i = 0; i < filesData.length; i++) {
    var row = filesData[i];
    if (row[0] == key) {
      var value = row[column];
      value += change;
      filesSheet.getRange(i + 1, column + 1, 1, 1).setValues([[value]])
      break;
    }
  }


}

function getUrlParameter_(name, url) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(url);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function getVersions_(key) {
  var versionInfo = callFigmaAPI_("https://api.figma.com/v1/files/" + key + "/versions");
  if (!versionInfo.versions || !versionInfo.versions.length) return ["No Versions",""]
  var v = versionInfo.versions.shift();
  return [v.user.handle, v.user.img_url];
}

function getFramePreviews_(key) {
  var ids = [];
  var fileInfo = callFigmaAPI_("https://api.figma.com/v1/files/" + key + "?depth=1")
  var document = fileInfo.document;
  if (!document) return ["magenta", ""];
  var page0 = document.children[0];
  var frame0 = page0.children[0];
  var background = page0.backgroundColor;
  var color = "rgba(" + [Math.round(background.r * 255), Math.round(background.g * 255), Math.round(background.b * 255), background.a].join(",") + ")";
  var frameURL = "";
  if (frame0) {
    ids.push(frame0.id);
     var images = callFigmaAPI_("https://api.figma.com/v1/images/" + key + (ids ? "?ids=" + ids.join(",") : ""))
     frameURL = images.images[frame0.id];
  }
  return [color, frameURL];
}

function getFigmaFramePreview_(url) {
  var re = /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
  var match = url.match(re)
  var key = match ? match[3] : url;
  var ids = getUrlParameter_("node-id", url)
  var infoUrl = "https://api.figma.com/v1/images/" + key + (ids ? "?ids=" + ids : "");
  Logger.log(infoUrl)
  var response = JSON.parse(UrlFetchApp.fetch(infoUrl, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("figma_token")}}));

  Logger.log(response)
  return response.images[ids]
}


function getFigmaProjects_(teamId) {
  var infoUrl = "https://api.figma.com/v1/teams/" + teamId + "/projects";
  var response = UrlFetchApp.fetch(infoUrl, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("figma_token")}});
  var json = response.getContentText();
  var data = JSON.parse(json);
  return data;
  //return data.projects.map(o => [data.name, o.id, o.name])
}
 
function getFigmaFiles_(projectId, prefix) {
  var infoUrl = "https://api.figma.com/v1/projects/" + projectId + "/files";
  var response = UrlFetchApp.fetch(infoUrl, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("figma_token")}});
  var json = response.getContentText();
  var data = JSON.parse(json);
  return data;
  //return data.files.map(f => [f.key, f.name, f.last_modified, f.thumbnail_url, prefix, data.name]);
}

function getFigmaInfo_(url) {
  // curl -H 'X-FIGMA-TOKEN: <personal access token>' ''
  // GET/v1/files/:key/comments
  var re = /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
  var match = url.match(re)
  Logger.log(match);
  
  if (!match) return;
  var key = match[3];
  var id = undefined;
  var infoUrl = "https://api.figma.com/v1/files/" + key + "?depth=1";  
  return callFigmaAPI_(infoUrl);
}

function callFigmaAPI_(url) {
  var response = UrlFetchApp.fetch(url, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("figma_token")}});
  var json = response.getContentText();
  var data = JSON.parse(json);
  try {
    var data = JSON.parse(json);
    return data;
  } catch (e) {
    Logger.log(e);
    Logger.log(json);
    return undefined;
  }
}

function getUserInfo_(email) {
  var user = AdminDirectory.Users.get(email, {viewType:'domain_public'});
  Logger.log('User data:\n %s', JSON.stringify(user, null, 2));
  return user;
}

var FIGMENT_CACHE = "FIGMENT_CACHE"
function getData(ignoreCache) {
  var cache = CacheService.getScriptCache();
  if (!ignoreCache && (cached = cache.get(GALLERY_CACHE)) != null) {    
    return cached; 
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Data");
  if (sheet == undefined) return JSON.stringify({"error": "not found"});

  var galleryData = sheet.getDataRange().getValues();
  var response = JSON.stringify({
    data: galleryData,
  });
  
  return response; 
}


function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getUser_(email) {
  email = email + "@" + scriptProperties.getProperty("domain");
  var user = AdminDirectory.Users.get(email, {viewType:'domain_public'});
  Logger.log(user);
  return user;
}