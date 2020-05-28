

![Favicon](https://github.com/alcor/figment/blob/master/img/favicon.png?raw=true) 


# Figment
Figment shares the work your whole team is doing with basic search, filtered views for tags, and more. It is run as a Google Sheet, which allows it to work within most organizations, and can be deployed by an individual on the team.

![Screenshot](https://github.com/alcor/figment/blob/master/img/screenshot.png?raw=true)


## Requirements
- Figma
- Gsuite (Google Sheets + App Script)

## Initial Setup

### Creating the sheet
- Create a copy of the [Figment Master Sheet](https://docs.google.com/spreadsheets/d/1DGcuIwNQIi2kulaafiv-73OwpkgvsKvrXTv5H4Nm624/copy)

### Setting Properties
- Open the script editor via Tools ▶ Script Editor   
- In the script editor, add the following Keys under  File ▶ Project properties ▶ Script properties
  - **figma_token** - your "Personal Access Token" for Figma, which can be generated from the Settings section of Figma 
  - **domain** - example.com
  - **slack_team** - The slack team id (optional)
  - sheet_url - the url for the spreadsheet you just created (optional, only if it does not work without it)

### Deploying
- Hit Publish ▶ Deploy as web app
  - Execute the app "as Me"
  - Give access to "Only myself"
- Update
- Approve any permissions dialogs which may appear

# Adding content

### Add Sources
- Open the "Sources" sheet and paste links to figma teams or proje (cts, one per row.
- In the sheets menu bar, select Figment ▶ Get Latest Figment Data

### Setting sources to update automatically
- In the Script Editor (Tools ▶ Script Editor), choose (Edit ▶ Current Project Triggers)
- Choose + Add Trigger in the lower Right
- Set up a trigger to run "getLatestFigmentData" automatically every hour (or as you see fit)

## Getting Updates
- Install Google Apps Script GitHub Assistant https://chrome.google.com/webstore/detail/google-apps-script-github/lfjcgcmkmjjlieihflfhjopckgpelofo
- Choose Login SCM
- Click gear, choose Manage manifest file
- Choose repsitory, select alcor/figment
- Hit down arrow icon in the toolbar to pull the latest
