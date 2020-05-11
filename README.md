# figment
Basic Figma sharing and awareness

Using this
- Install Google Apps Script GitHub Assistant https://chrome.google.com/webstore/detail/google-apps-script-github/lfjcgcmkmjjlieihflfhjopckgpelofo

- Create a spreadsheet, named whatever
- Name the first sheet "Figment"
- Open the script editor via Tools > Script Editor
- Name the project Anything
- Choose Login SCM
- Click gear, choose Manage manifest file
- Choose repsitory, select alcor/figment
- Hit down arrow to pull
- Resources > Advanced Google services
   - Accept cloud console terms of service if needed (Shows up as a prompt at the bottom)
   - Turn on Directory
- In the script editor, add the following Keys under  File > Project properties > script properties
  - figma_key - your personal key for figma
  - domain - example.com
  - slack_team - The slack team id
  - sheet_url - the url for the spreadsheet you just created
- Hit Publish > Deploy as web app
  - Execute the app "as Me"
- Authorize
