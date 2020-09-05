//
// Figment 1.1.3
//
// Maintains a sorted spreadhseet of recent work within specified Figma projects and teams
// Provides a web preview of that work to users within the same organization
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


// Render the web view
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
    template.default_team = scriptProperties.getProperty("default_team") || "*";
    output = template.evaluate();
  }
  
  return output
    .setTitle("Figment")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}


// Get sheet, creating if needed
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

// Column indexes for the File sheet
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

// Request a token, create all default sheets
function initialSetup_() {
  createAllSheets_();
  
  var token = scriptProperties.getProperty("figma_token");
  if (token == undefined) {
    requestToken_();
  }
  
  installTrigger()
}
  
// Install a trigger to automatically update the list of files once an hour
function installTrigger() {
  if (ScriptApp.getProjectTriggers().length < 1) {
    ScriptApp.newTrigger('getLatestFigmentData')
        .timeBased()
        .everyHours(1)
        .nearMinute(0)
        .create();
  }
}

// Remove update trigger
function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger){
    ScriptApp.deleteTrigger(trigger);
  });
}

// Prompt user for a figma access token
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

// Create default spreadsheets
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

  var re = /https:\/\/(?:[\w\.-]+\.)?figma.com\/files\/(?:[^\/]+\/)?(team|project|file)\/([^\/]+)\/.*/  
  var filesSheet = getFilesSheet_()
  var keys = filesSheet.getRange("A:A").getValues();
  keys = keys.map(k => k[0]);
  
  var today = new Date()
  var priorDate = new Date().setDate(today.getDate() - 31)
  var teamCount = 0;

  // Process each source
  for ( i = 1 ; i < sourceData.length; i++){
    sourcesSheet.getRange(i + 1, 2).setBackground("yellow") // mark current source with yellow cell
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
    if (type == "team") { // fetch all projects for a team
      var results = callFigmaAPI_("/v1/teams/" + id + "/projects");
      teamName = results.name;
      projects = results.projects.map(p => p.id)
    } else if (type == "project") { // push contents for a single project
      projects.push(id)
    } else if (type == "file") { // push file for a single file
      var f = callFigmaAPI_("/v1/files/" + id + "?depth=1");
      fileRows.push([id, f.name, f.lastModified, f.thumbnailUrl]);
    }
    
    // Iterate through projects and enumerate files
    projects.forEach(p => { 
      var data = callFigmaAPI_("/v1/projects/" + p + "/files");
    
      var projectName = data.name;
      
      if (projectName.includes("#hidden")) return;
      
      // Update only files changed since last run
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
 
    // Update counts in the sources sheet
    sourcesSheet.getRange(i + 1, 2).setValue(date);
    sourcesSheet.getRange(i + 1, 3).setValue(count);
    sourcesSheet.getRange(i + 1, 2).setBackground(null);

  }
  
  filesSheet.sort(3, false);
  lock.releaseLock();
}

// Main entry point for the update flow. Update sources,then files, then cache data
function getLatestFigmentData_() {
  updateSources_();
  updateFiles_();
  updateCache_();
}

function updateCache_() {  
  var cache = CacheService.getDocumentCache();
  var data = getData(true)
  try {
    cache.put(FIGMENT_CACHE, data, 60);
  } catch(e) {
    Logger.log(e);
  }
}

// Iterate through any changed files and fetch latest metadata
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

// Fetch metadata and previews for a file
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
  
  // Only run this if the file has been changed
  if (!metadataUpdated.length ||  fileUpdated > metadataUpdated) {
    Logger.log("Updating " + key);
    try {
      filesSheet.getRange(i + 1, COLUMN.UPDATED.index + 1).setBackground("yellow")
       SpreadsheetApp.flush();
       
       metadata = {...metadata, ...getFramePreviews_(key)} // merge results
      
      // Get last edit information
      var versions = getVersions_(key);
      var lastVersion = versions.shift();
      metadata.edited = {id:lastVersion.user.handle, img:lastVersion.user.img_url, ts:lastVersion.created_at};
      metadata.vcount = versions.count;
      
      // Get creation information
      if (metadata.created == undefined) {
        var firstVersion = getFirstVersion_(key);
        metadata.created = {id:firstVersion.user.handle, img:firstVersion.user.img_url, ts:firstVersion.created_at};
      }  
      
      // Update rows in the sheet
      filesSheet.getRange(i + 1, updateColumn, 1, 2).setValues([[fileUpdated, JSON.stringify(metadata)]]);
      filesSheet.getRange(i + 1, updateColumn).setBackground(null);
      filesSheet.getRange(i + 1, updateColumn).setNote(null);

    } catch (e) { // Log errors as a note in the sheet
      filesSheet.getRange(i + 1, updateColumn).setNote(e.name + ": " + e.message + "\n\n" + e.stack);
      filesSheet.getRange(i + 1, updateColumn).setBackground("red");
      return;
    }
  }
}

// Callback function from the web view to increment likes and open counts.
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


// Fetch latest version information
function getVersions_(key) {
  var versionInfo = callFigmaAPI_("/v1/files/" + key + "/versions");
  if (!versionInfo.versions || !versionInfo.versions.length) return ["No Versions",""]
  return versionInfo.versions; //[v.user.handle, v.user.img_url];
}

// Fetch earliest version
function getFirstVersion_(key) {
  var versionInfo = callFigmaAPI_("/v1/files/" + key + "/versions?page_size=1&before=0");
  if (!versionInfo.versions || !versionInfo.versions.length) return undefined;
  return versionInfo.versions.shift();
}

// Fetch previews for a given file
// This increments through canvases looking for the best size / type combinations

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
  
  // Iterate through all the canvases
  document.children.forEach(canvas => {
    var name = canvas.name;
                            
    // Ignore title and other utility canvases
    var utilityCanvas = name.match(canvasIgnoreRE);
    if (!defaultCanvasId && !utilityCanvas) {
      defaultCanvasId = canvas.id;
      Logger.log(defaultCanvasId);
    }
    
    if (utilityCanvas) return;
    
    canvas.children.forEach(frame => {
      // Only include frame and component canvases
      if (frame.type != "FRAME" && frame.type != "INSTANCE" && frame.type != "COMPONENT") return;
      
      var isHero = frame.name.includes("#figment");
      var box = frame.absoluteBoundingBox;

      // Feature canvases with #figment in their name
      if (!isHero) { 
        if (heroes.length) return;
        if (thumbnails.length > 5) return;
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
  
  // Get list of thumbnails for a given canvas.
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

// Get a preview image for a given Figma file
function getFigmaFramePreview_(url) {
  var re = /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
  var match = url.match(re)
  var key = match ? match[3] : url;
  var ids = getUrlParameter_("node-id", url)
  var response = callFigmaAPI_("/v1/images/" + key + (ids ? "?ids=" + ids : ""))
  return response.images[ids]
}

// Get information for a given Figma file
function getFigmaInfo_(url) {
  var re = /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
  var match = url.match(re)
  Logger.log(match);
  
  if (!match) return;
  var key = match[3];
  var id = undefined;
  return callFigmaAPI_("/v1/files/" + key + "?depth=1");
}

// Wrapper for all Figma API calls
function callFigmaAPI_(path) {
  var url = "https://" + figma_api + path
  try {
    Logger.log(url)
    var response = UrlFetchApp.fetch(url, {headers: {"X-FIGMA-TOKEN": scriptProperties.getProperty("figma_token")}});
    var json = response.getContentText();
    Logger.log(json);
    var data = JSON.parse(json);
    return data;
  } catch (e) {
    Logger.log(e);
    Logger.log(json);
    return undefined;
  }
}

// Cache file listing to reduce spreadsheet access
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

// Include utility function
function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
