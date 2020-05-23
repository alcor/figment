# Figment
Basic Figma sharing and awareness

## Initial Setup

### Creating the sheet
- Create a copy of the Figment Master Sheet - https://docs.google.com/spreadsheets/d/1DGcuIwNQIi2kulaafiv-73OwpkgvsKvrXTv5H4Nm624/copy
- Open the script editor via Tools > Script Editor   

### Setting Properties
- In the script editor, add the following Keys under  File > Project properties > script properties
  - figma_token - your personal key for figma
  - domain - example.com
  - slack_team - The slack team id
  - sheet_url - the url for the spreadsheet you just created

### Granting permission to look up names and photos for authors
- Resources > Advanced Google services
 - Accept cloud console terms of service if needed (Shows up as a prompt at the bottom)
 - Turn on Directory

### Deploying
- Hit Publish > Deploy as web app
  - Execute the app "as Me"
- Authorize



## Getting Updates
- Install Google Apps Script GitHub Assistant https://chrome.google.com/webstore/detail/google-apps-script-github/lfjcgcmkmjjlieihflfhjopckgpelofo
- Choose Login SCM
- Click gear, choose Manage manifest file
- Choose repsitory, select alcor/figment
- Hit down arrow to pull
