module Pug where

import Prelude
import Effect (Effect)
import Data.Function.Uncurried (Fn2, Fn3, runFn2, runFn3)
import Foreign (Foreign, unsafeToForeign)
import Node.Path (FilePath)

-- FFI functions
foreign import renderFileImpl :: Fn2 String Foreign String
foreign import writeFileImpl :: Fn3 String String Unit Unit
foreign import ensureDirImpl :: Fn2 String Unit Unit
foreign import copyDirImpl :: Fn3 String String Unit Unit

-- Render template from file with data
renderFile :: forall r. String -> Record r -> Effect String
renderFile templatePath data' = pure $ runFn2 renderFileImpl templatePath (unsafeToForeign data')

-- Write content to file
writeFile :: FilePath -> String -> Effect Unit
writeFile path content = pure $ runFn3 writeFileImpl path content unit

-- Ensure directory exists
ensureDir :: FilePath -> Effect Unit
ensureDir path = pure $ runFn2 ensureDirImpl path unit

-- Copy directory recursivelys
copyDir :: FilePath -> FilePath -> Effect Unit
copyDir src dest = pure $ runFn3 copyDirImpl src dest unit
