/**
 * Bundle entry — exports runtime API + registers all components.
 *
 * Build with `wely build --bundle` to produce a single file
 * that consumers can drop into any page:
 *
 *   <script src="wely.bundle.umd.js"></script>
 *   <w-counter start="5"></w-counter>
 */

export * from './runtime'
import './components'
