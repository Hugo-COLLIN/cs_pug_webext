# Script injecté dans les pages web
console.log 'Content script chargé'

class ContentManager
  constructor: ->
    @enabled = false
    @settings = {}
    @init()

  init: ->
    @loadSettings()
    @setupUI()
    @bindEvents()

  loadSettings: ->
    chrome.runtime.sendMessage
      type: 'getData'
    , (response) =>
      @enabled = response.enabled ? false
      @settings = response.settings ? {}
      @updateUI() if @enabled

  setupUI: ->
# Créer un indicateur visuel
    @indicator = document.createElement 'div'
    @indicator.id = 'extension-indicator'
    @indicator.style.cssText = '''
      position: fixed;
      top: 10px;
      right: 10px;
      width: 50px;
      height: 50px;
      background: #4CAF50;
      border-radius: 50%;
      z-index: 10000;
      cursor: pointer;
      display: none;
    '''
    document.body.appendChild @indicator

  updateUI: ->
    if @enabled
      @indicator.style.display = 'block'
      @indicator.style.background = if @settings.theme is 'dark' then '#333' else '#4CAF50'

  bindEvents: ->
    @indicator.addEventListener 'click', =>
      @showNotification 'Extension active!'

  showNotification: (message) ->
    notification = document.createElement 'div'
    notification.textContent = message
    notification.style.cssText = '''
      position: fixed;
      top: 70px;
      right: 10px;
      background: #333;
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 10001;
    '''

    document.body.appendChild notification

    setTimeout ->
      notification.remove()
    , 3000

# Initialiser le gestionnaire
contentManager = new ContentManager()

# Écouter les changements de configuration
chrome.runtime.onMessage.addListener (message, sender, sendResponse) ->
  if message.type is 'settingsChanged'
    contentManager.loadSettings()
