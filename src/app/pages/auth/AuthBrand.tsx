import LogoSVG from '$public/res/svg/logo.svg';
import * as css from './styles.css';

/** The centered BlockWire brand block above the auth card — the first thing
 *  every invited user sees. Presentation only: no auth logic lives here.
 *  The wordmark splits "Block" (text) / "Wire" (accent purple) so the brand
 *  reads even before the logo asset loads. */
export function AuthBrand() {
  return (
    <div className={css.AuthBrand}>
      <img className={css.AuthBrandLogo} src={LogoSVG} alt="BlockWire logo" />
      <h1 className={css.AuthBrandWordmark}>
        Block
        <span className={css.AuthBrandWordmarkAccent}>Wire</span>
      </h1>
      <p className={css.AuthBrandTagline}>Feels like Telegram. Built for crypto.</p>
    </div>
  );
}
