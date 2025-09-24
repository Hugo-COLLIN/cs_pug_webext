document.addEventListener 'DOMContentLoaded', ->
  console.log "Popup chargé pour #{APP_TARGET}"

  # Template Pug intégré directement dans le CoffeeScript
  ### language=pug ###
  popupTemplate = pug`
  .popup-container
  header.popup-header
  h1#app-title= title
  .version-badge= version

  main.popup-main
  .form-group
  label.toggle-label
  input#enable-toggle(type="checkbox" ?enabled=enabled)
  .toggle-switch
  span Extension activée

  .form-group
  label Theme :
  select#theme-select
  option(value="light") Clair
  option(value="dark") Sombre

  .actions
  button.primary#save-btn Sauvegarder
  button.secondary#options-btn Options

  .status#status-message
  `

    # Données pour le template
    data =
      title: 'Mon Extension'
    version: "v#{APP_VERSION}"
    enabled: true

    # Injecter le HTML généré
    document.body.innerHTML = popupTemplate(data)

    # Gestion des événements
    setupEventHandlers()

    setupEventHandlers = ->
    enableToggle = document.getElementById 'enable-toggle'
    themeSelect = document.getElementById 'theme-select'
    saveBtn = document.getElementById 'save-btn'

    # Charger les paramètres existants
    chrome.storage.sync.get ['enabled', 'theme'], (result) ->
      enableToggle.checked = result.enabled ? true
        themeSelect.value = result.theme ? 'light'

    # Sauvegarde des paramètres
    saveBtn.addEventListener 'click', ->
    settings =
      enabled: enableToggle.checked
    theme: themeSelect.value

    chrome.storage.sync.set settings, ->
    showStatus 'Paramètres sauvegardés!', 'success'

    showStatus = (message, type = 'info') ->
      statusEl = document.getElementById 'status-message'
    statusEl.textContent = message
    statusEl.className = "status #{type}"

    setTimeout ->
      statusEl.textContent = ''
    statusEl.className = 'status'
      , 2000
