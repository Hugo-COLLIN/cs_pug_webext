module Main where

import Prelude

import Effect (Effect)
import Effect.Console (log)

-- Fonction utilitaire pour l'extension
initExtension :: Effect Unit
initExtension = do
  log "Extension PureScript initialisée"

-- Point d'entrée principal (utilisé pour les fonctions partagées)
main :: Effect Unit
main = do
  log "Main PureScript module chargé"
  initExtension
