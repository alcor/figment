# Figment
Figment lets folks on your team share figma files with basic search, tags, and more. It is run as a Google Sheet, which allows it to work within most organizations, using the permissions of one individual in that team.

## Initial Setup

### Creating the sheet
- Create a copy of the [Figment Master Sheet](https://docs.google.com/spreadsheets/d/1DGcuIwNQIi2kulaafiv-73OwpkgvsKvrXTv5H4Nm624/copy)
- Open the script editor via Tools > Script Editor   

### Setting Properties
- In the script editor, add the following Keys under  File > Project properties > script properties
  - figma_token - your "Personal Access Token" for Figma, which can be generated from the Settings section of Figma 
  - domain - example.com
  - slack_team - The slack team id (optional)
  - sheet_url - the url for the spreadsheet you just created (optional, only if it does not work without it)

### Granting permission to look up names and photos for authors
- Resources > Advanced Google services
 - Accept cloud console terms of service if needed (Shows up as a prompt at the bottom)
 - Turn on Directory

### Deploying
- Hit Publish > Deploy as web app
  - Execute the app "as Me"
  - Give access to "Only myself"
- Update
- Approve any permissions dialogs which may appear



## Getting Updates
- Install Google Apps Script GitHub Assistant https://chrome.google.com/webstore/detail/google-apps-script-github/lfjcgcmkmjjlieihflfhjopckgpelofo
- Choose Login SCM
- Click gear, choose Manage manifest file
- Choose repsitory, select alcor/figment
- Hit down arrow to pull
