/** This file is part of Super Castle Game.
 * @license GPLv3 | Copyright (c) 2023 Mark Vasilkov
 */
"use strict";

import { decodeBitmapBigInt } from "../node_modules/natlib/bitmap/bitmap.js";
import { easeInOutQuad } from "../node_modules/natlib/interpolation.js";
import { height, startCodePoint, value, width } from "./ascii_upper.js";
import { con, oscillate, wrapAround } from "./setup.js";

export function printCenter(
  x0: number,
  y0: number,
  scale: number,
  text: string,
  effectStrength = 0,
  t = 0,
) {
  x0 -= 0.5 * scale * (text.length * (width + 1) - 1);
  y0 -= 0.5 * scale * height;

  for (let caret = 0, n = 0; n < text.length; ++n) {
    const skip = text.charCodeAt(n) - startCodePoint;
    if (skip >= 0) {
      const glyph = value >> BigInt(skip * width * height); // .Inline
      const Δy = effectStrength
        ? effectStrength *
          scale *
          easeInOutQuad(oscillate(wrapAround(t + 0.1 * n)))
        : 0;
      decodeBitmapBigInt(
        glyph,
        width,
        height,
        2n,
        (x, y, value) =>
          value &&
          con.rect(x0 + caret + scale * x, y0 + Δy + scale * y, scale, scale),
      );
    }
    caret += scale * (width + 1);
  }
}
