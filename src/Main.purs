module Main where

import Prelude
import Effect (Effect)
import Site.Generator (generateSite)

main :: Effect Unit
main = generateSite
