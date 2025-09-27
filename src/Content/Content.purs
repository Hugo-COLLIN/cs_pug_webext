module Content.Content where

import Prelude

import Effect (Effect)
import Effect.Console (log)
import Web.HTML (window)
import Web.HTML.Location (href)
import Web.HTML.Window (location)

-- Fonction pour analyser la page courante
analyzePage :: Effect Unit
analyzePage = do
  win <- window
  loc <- location win
  url <- href loc
  log $ "Content script actif sur: " <> url

  -- Ici vous pouvez ajouter votre logique d'analyse de page
  -- Par exemple: compter les liens, analyser le contenu, etc.

-- Fonction pour injecter du CSS personnalisé
injectStyles :: Effect Unit
injectStyles = do
  log "Injection des styles personnalisés"
  -- Ici vous pouvez ajouter du CSS dynamiquement

-- Point d'entrée du script de contenu
main :: Effect Unit
main = do
  log "Script de contenu PureScript chargé"
  analyzePage
  injectStyles
