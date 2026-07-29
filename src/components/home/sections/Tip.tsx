/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { styled } from '@linaria/react';
import { Link } from '../../../router/react';
import { KeepTip } from '../../keep-elements/react/KeepTip';

/**
 * The anchor that makes the whole tile clickable.
 *
 * It is the card's *media* — it wraps the image and is slotted into `<keep-tip>` — and its
 * `::after` stretches over the rest of the card, so the heading and description stay part of
 * the same single hit area they were in when the anchor wrapped everything. One link, one
 * accessible name, whole tile clickable.
 *
 * **This rule has to live out here, in document scope.** Shadow CSS can style a slotted
 * element with `::slotted()` but not its pseudo-elements — `::slotted(a)::after` matches
 * nothing. `keep-tip` supplies the other half by making `:host` the positioning context.
 *
 * Replaces MUI's `CardActionArea`, which rendered a `<button>` *inside* this anchor:
 * interactive content nested in interactive content, which is invalid HTML and gives
 * keyboard and screen-reader users two stops where there is one destination.
 */
const TipLink = styled(Link)`
  display: block;
  line-height: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
  }

  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

interface TipProps {
  heading: string;
  description: string;
  backgroundImage: string;
  uri: string;
}

const Tip: React.FC<TipProps> = ({ heading, description, backgroundImage, uri }) => (
  <KeepTip className="feature-item" heading={heading} description={description}>
    {/*
      `slot="media"` puts this in `<wa-card>`'s media section, forwarded through `keep-tip`.
      The anchor stays in the light DOM deliberately — see the note on the element for the
      three things that break silently when it does not.

      The image is decorative: the heading and description beside it carry the meaning, so an
      empty alt keeps a screen reader from announcing the tile twice.
    */}
    <TipLink slot="media" to={uri}>
      <img src={backgroundImage} alt="" />
    </TipLink>
  </KeepTip>
);

export default Tip;
