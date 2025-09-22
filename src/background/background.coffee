# Service Worker pour Manifest V3
console.log 'Background script démarré'

# Écouter l'installation de l'extension
chrome.runtime.onInstalled.addListener (details) ->
  if details.reason is 'install'
    console.log 'Extension installée pour la première fois'

    # Définir des valeurs par défaut
    chrome.storage.sync.set
      enabled: true
      settings:
        theme: 'dark'
        notifications: true

# Écouter les messages des content scripts
chrome.runtime.onMessage.addListener (message, sender, sendResponse) ->
  switch message.type
    when 'getData'
      chrome.storage.sync.get ['enabled', 'settings'], (data) ->
        sendResponse data
    when 'saveData'
      chrome.storage.sync.set message.data, ->
        sendResponse success: true
    else
      console.log 'Message non géré:', message

  # Retourner true pour réponse asynchrone
  true

# Gérer le clic sur l'icône de l'extension
chrome.action.onClicked.addListener (tab) ->
  console.log 'Icône cliquée sur:', tab.url
