//
// Figment 1.1.1
//
// see https://github.com/alcor/figment/ for information on
// initial setup and how to update this script to the latest version 
//

var scriptProperties = PropertiesService.getScriptProperties();
var figma_server = scriptProperties.getProperty("figma_server") || "www.figma.com";
var figma_api = scriptProperties.getProperty("figma_api") || "api.figma.com";

var lock = LockService.getScriptLock();
var sheetURL = scriptProperties.getProperty("sheet_url");
if (sheetURL) SpreadsheetApp.setActiveSpreadsheet(SpreadsheetApp.openByUrl(url));

function getLatestFigmentData() { return getLatestFigmentData_(); }

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🅵 Figment')
    .addItem('⚙️ Run Setup', 'initialSetup_')
    .addItem('🔄 Sync Figment Data', 'getLatestFigmentData')
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
    template.COLUMN_KEYS = JSON.stringify(COLUMN);
    template.omit_tags = scriptProperties.getProperty("omit_tags");
    template.slack_team = scriptProperties.getProperty("slack_team");
    template.figma_host = scriptProperties.getProperty("figma_server") || "www.figma.com";
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


var COLUMN = { 
  KEY: {index:0, name:"Key"},
  TITLE: {index:1, name:"Title"},
  MODIFIED: {index:2, name:"Modified"},
  THUMBNAIL: {index:3, name:"Thumbnail"},
  TEAM: {index:4, name:"Team"},
  PROJECT: {index:5, name:"Project"},
  UPDATED: {index:6, name:"Updated"},
  METADATA: {index:7, name:"Metadata"},
  VOTES: {index:8, name:"Votes"},
  OPENS: {index:9, name:"Opens"}
}

var fileColumns = Object.values(COLUMN).sort((a,b) => a.index > b.index).map(c => c.name)

function initialSetup_() {
  createAllSheets_();
  
  var token = scriptProperties.getProperty("figma_token");
  if (token == undefined) {
    requestToken_();
  }
  
  installTrigger()
}
  
function installTrigger() {
  if (ScriptApp.getProjectTriggers().length < 1) {
    ScriptApp.newTrigger('getLatestFigmentData')
        .timeBased()
        .everyHours(1)
        .nearMinute(0)
        .create();
  }
}

function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger){
    ScriptApp.deleteTrigger(trigger);
  });
}

function requestToken_() {

  var ui = SpreadsheetApp.getUi(); // Same variations.
  var result = ui.prompt(
      '⚙ Figment Setup',
      'Please enter a Figma Personal Access Token\nfrom https://www.figma.com/settings\n',
      ui.ButtonSet.OK_CANCEL);

  // Process the user's response.
  var button = result.getSelectedButton();
  var text = result.getResponseText();
  if (button == ui.Button.OK) {
    // User clicked "OK".
    scriptProperties.setProperty("figma_token", text);
    ui.alert('Access Token Saved!\nNow add some teams and projects, and Sync Figma data');
  } else if (button == ui.Button.CANCEL) {
  } else if (button == ui.Button.CLOSE) {
  }
  
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

  lock.waitLock(10000);
  var sourcesSheet = getSourcesSheet_();
  var sourceData = sourcesSheet.getDataRange().getValues();

  var re = /https:\/\/(?:[\w\.-]+\.)?figma.com\/(?:files\/\d+\/)?(team|project|file)\/([^\/]+)\/.*/  
  var filesSheet = getFilesSheet_()
  var keys = filesSheet.getRange("A:A").getValues();
  keys = keys.map(k => k[0]);
  
  var today = new Date()
  var priorDate = new Date().setDate(today.getDate() - 31)
  var teamCount = 0;

  for ( i = 1 ; i < sourceData.length; i++){
    sourcesSheet.getRange(i + 1, 2).setBackground("yellow")
    SpreadsheetApp.flush();

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
      var results = callFigmaAPI_("/v1/teams/" + id + "/projects");
      teamName = results.name;
      projects = results.projects.map(p => p.id)
    } else if (type == "project") {
      projects.push(id)
    } if (type == "file") {
      var f = callFigmaAPI_("/v1/files/" + id + "?depth=1");
      fileRows.push([f.key, f.name, f.last_modified, f.thumbnail_url]);
      continue;
    }
    
    projects.forEach(p => { 
      var data = callFigmaAPI_("/v1/projects/" + p + "/files");
  
      var projectName = data.name;
        data.files.forEach(f => {
          var dateModified = new Date(f.last_modified);
          if (dateModified > priorDate) {          
            var newRow = [f.key, f.name, f.last_modified, f.thumbnail_url, teamName, projectName];
            fileRows.push(newRow);
            teamCount++;
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
    sourcesSheet.getRange(i + 1, 2).setBackground(null);

  }
  
  filesSheet.sort(3, false);
  lock.releaseLock();
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

function updateFiles() { updateFiles_() };
function updateFiles_() {
  lock.waitLock(10000);
  var filesSheet = getFilesSheet_();
  var filesData = filesSheet.getDataRange().getValues();
  var keys = filesData.map(k => k[0]);
  for (var i = 1; i < filesData.length; i++) {  
    updateFile_(filesData[i], i, filesSheet);
    SpreadsheetApp.flush();
  }
  lock.releaseLock();
}
function updateFile_(file, i, filesSheet) {

  var key = file[COLUMN.KEY.index];
  var fileUpdated = file[COLUMN.MODIFIED.index];
  var metadataUpdated  = file[COLUMN.UPDATED.index]
  var metadata = file[COLUMN.METADATA.index]
  var updateColumn = COLUMN.UPDATED.index + 1;
  
  try {
    metadata = JSON.parse(metadata);
  } catch (e) {
    metadata = {};
  }
  
  if (!metadataUpdated.length ||  fileUpdated > metadataUpdated) {
    Logger.log("Updating " + key);
    try {
      filesSheet.getRange(i + 1, COLUMN.UPDATED.index + 1).setBackground("yellow")
       SpreadsheetApp.flush();
       
       metadata = {...metadata, ...getFramePreviews_(key)} // merge results
      
      var versions = getVersions_(key);
      var lastVersion = versions.shift();
      metadata.edited = {id:lastVersion.user.handle, img:lastVersion.user.img_url, ts:lastVersion.created_at};
      metadata.vcount = versions.count;
      
      if (metadata.created == undefined) {
        var firstVersion = getFirstVersion_(key);
        metadata.created = {id:firstVersion.user.handle, img:firstVersion.user.img_url, ts:firstVersion.created_at};
      }  
      
      filesSheet.getRange(i + 1, updateColumn, 1, 2).setValues([[fileUpdated, JSON.stringify(metadata)]]);
      filesSheet.getRange(i + 1, updateColumn).setBackground(null);
      filesSheet.getRange(i + 1, updateColumn).setNote(null);

    } catch (e) {
      filesSheet.getRange(i + 1, updateColumn).setNote(e.name + ": " + e.message + "\n\n" + e.stack);
      filesSheet.getRange(i + 1, updateColumn).setBackground("red");
      return;
    }
  }
}

function incrementAttributeValue(key, attribute, change) {
  var filesSheet = getFilesSheet_();
  var filesData = filesSheet.getDataRange().getValues();
  
  var column = COLUMN[attribute].index

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
  var versionInfo = callFigmaAPI_("/v1/files/" + key + "/versions");
  if (!versionInfo.versions || !versionInfo.versions.length) return ["No Versions",""]
  return versionInfo.versions; //[v.user.handle, v.user.img_url];
}

function getFirstVersion_(key) {
  var versionInfo = callFigmaAPI_("/v1/files/" + key + "/versions?page_size=1&before=0");
  if (!versionInfo.versions || !versionInfo.versions.length) return undefined;
  return versionInfo.versions.shift();
}

var canvasIgnoreRE = /^(cover|COVER|Cover|Title|title|--+|––+|——+)/i
function getFramePreviews_(key) {
  var fileInfo = callFigmaAPI_("/v1/files/" + key + "?depth=2")
  if (fileInfo == undefined) fileInfo = callFigmaAPI_("/v1/files/" + key + "?depth=1")
  if (fileInfo == undefined) return {};

  var document = fileInfo.document;
  if (!document) return {};
  
  var page0 = document.children[0];
  var frame0 = page0.children[0];
  var background = page0.backgroundColor;
  var color = "rgba(" + [Math.round(background.r * 255), Math.round(background.g * 255), Math.round(background.b * 255), background.a].join(",") + ")";
  var frameURL = "";
  var defaultCanvasId;
  var thumbnails = [];
  var heroes = [];
  document.children.forEach(canvas => {
    var name = canvas.name;
    var utilityCanvas = name.match(canvasIgnoreRE);
    if (!defaultCanvasId && !utilityCanvas) {
      defaultCanvasId = canvas.id;
      Logger.log(defaultCanvasId);
    }
    
    if (utilityCanvas) return;
    
    canvas.children.forEach(frame => {
      if (frame.type != "FRAME" && frame.type != "INSTANCE" && frame.type != "COMPONENT") return;
      
      var isHero = frame.name.includes("#figment");
      var box = frame.absoluteBoundingBox;

      if (!isHero) { 
        if (heroes.length) return;
        if (thumbnails.length > 4) return;
        if (frame.name.startsWith("Frame ")) return;
        if (box.width < 360) return;
        if (box.height < 720) return;
        if ((box.width / box.height) > 3) return;
        if ((box.height / box.width) > 3) return;
      }
      
      (isHero ? heroes : thumbnails).push({id:frame.id, w:box.width, h:box.height, name:frame.name});
      
    });
    
  });
  
  var metadata = {color:color}
  
  thumbnails = heroes.length ? heroes : thumbnails;
  if (thumbnails.length > 0) {
     var response = callFigmaAPI_("/v1/images/" + key + "?ids=" + thumbnails.map(t => t.id).join(","));
     
     thumbnails.forEach(t => {
       t.img = (response.images[t.id]);
     });
     metadata.imgs = thumbnails;
  }
  return metadata;
}

function getFigmaFramePreview_(url) {
  var re = /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
  var match = url.match(re)
  var key = match ? match[3] : url;
  var ids = getUrlParameter_("node-id", url)
  var response = callFigmaAPI_("/v1/images/" + key + (ids ? "?ids=" + ids : ""))
  return response.images[ids]
}

 
function getFigmaInfo_(url) {
  var re = /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
  var match = url.match(re)
  Logger.log(match);
  
  if (!match) return;
  var key = match[3];
  var id = undefined;
  return callFigmaAPI_("/v1/files/" + key + "?depth=1");
}

function callFigmaAPI_(path) {
  var url = "https://" + figma_api + path
  try {
    var response = UrlFetchApp.fetch(url, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("figma_token")}});
    var json = response.getContentText();
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