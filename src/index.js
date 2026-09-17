import Flmngr from './flmngr';

// The plugin class itself is the default export, so
//   import Flmngr from "@edsdk/flmngr-ckeditor5";
//   ... plugins: [ ..., Flmngr ]
// works as the docs show. The named export and the `.Flmngr` property keep the
// old `{ Flmngr }` shape working for existing setups.
Flmngr.Flmngr = Flmngr;

export { Flmngr };
export default Flmngr;
