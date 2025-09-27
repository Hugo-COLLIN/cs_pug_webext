module Pug where

import Prelude
import Effect (Effect)
import Data.Function.Uncurried (Fn2, runFn2)
import Foreign (Foreign, unsafeToForeign)

-- Foreign function to compile Pug templates
foreign import compileFileImpl :: Fn2 String Foreign String
foreign import renderImpl :: Fn2 String Foreign String

-- Compile a Pug file to HTML string
compileFile :: String -> Effect String
compileFile templatePath = pure $ runFn2 compileFileImpl templatePath (unsafeToForeign {})

-- Render a Pug template string with data
render :: forall r. String -> Record r -> Effect String
render template data' = pure $ runFn2 renderImpl template (unsafeToForeign data')

-- Render template from file with data
renderFile :: forall r. String -> Record r -> Effect String
renderFile templatePath data' = pure $ runFn2 compileFileImpl templatePath (unsafeToForeign data')
