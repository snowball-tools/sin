import { serve } from "https://deno.land/std@0.153.0/http/server.ts"
import ssr from '../../ssr/deno.js'
import app from './index.js'

await serve(ssr(app), { port: 8000 })
