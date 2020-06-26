

![Favicon](https://github.com/alcor/figment/blob/master/img/favicon.png?raw=true) 


# Figment
Figment shares the work from your whole team with basic search, filtered views for tags, and more.
It is a fancy Google Sheet with scripts, which allows it to work within most organizations, and can be deployed by an individual on the team.

![Screenshot](https://github.com/alcor/figment/blob/master/img/screenshot.png?raw=true)


## Requirements
- Figma
- Gsuite (Google Sheets + Scripts)

## Initial Setup

### 1. Creating the sheet
- Create a copy of the [Figment Master Sheet](https://docs.google.com/spreadsheets/d/1DGcuIwNQIi2kulaafiv-73OwpkgvsKvrXTv5H4Nm624/copy)

### 2. Setting Properties
- Run Setup from the Figment menu (you'll need a [token from figma](https://www.figma.com/settings))
- Add a few teams/projects to the Sources sheet (one per row.) - just copy a link to those teams' pages in Figma
- Choose Sync Figment Data from the Figment menu

### 3. Deploying the website
- Open the script editor via Tools ▶ Script Editor   
- Hit Publish ▶ Deploy as web app
  - Execute the app "as Me"
  - Give access to "Only myself"
- Update
- Approve any permissions dialogs which may appear

### 4. Getting Updates
- Install Google Apps Script GitHub Assistant https://chrome.google.com/webstore/detail/google-apps-script-github/lfjcgcmkmjjlieihflfhjopckgpelofo
- Choose Login SCM
- Click gear, choose Manage manifest file
- Choose repsitory, select alcor/figment
- Hit down arrow icon in the toolbar to pull the latest
