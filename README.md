

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
- Run Setup from the Figment menu
- Add a few teams/projects to the Sources sheet (one per row.)
- Sync Figment Data from the Figment menu

### Deploying
- Open the script editor via Tools ▶ Script Editor   
- Hit Publish ▶ Deploy as web app
  - Execute the app "as Me"
  - Give access to "Only myself"
- Update
- Approve any permissions dialogs which may appear

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
