/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getTheme } from '../../../store/styles/action';
import { AppState } from '../../../store';

const CardContainer = styled(Card)<{ theme: string; bg: string }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-self: stretch;
  background: ${props => getTheme(props.theme).secondary} !important;
  margin-left: 8px;
  margin-right: 8px;
  border-radius: 8px !important;
  overflow: hidden;

  @media only screen and (max-width: 768px) {
    margin-right: 0;
  }

  .link {
    text-decoration: none;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  /* Ensure CardActionArea grows with content and doesn't clip the title. */
  .MuiCardActionArea-root {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    height: 100%;
  }

  /* CardContent must be visible in full so the title isn't cut off. */
  .MuiCardContent-root {
    flex: 1;
    overflow: visible;
  }
`;

interface TipProps {
  heading: string;
  description: string;
  backgroungImage: string;
  uri: string;
}

const Tip: React.FC<TipProps> = ({
  heading,
  description,
  backgroungImage,
  uri,
}) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  return (
    <CardContainer
      className="feature-item"
      bg={backgroungImage}
      theme={themeMode}
    >
      <Link className="link" to={uri}>
        <CardActionArea>
          <CardMedia
            component="img"
            image={backgroungImage}
            title={description}
            sx={{
              /* Image scales to fit the card width with no
                 horizontal letterboxing; height is derived from
                 the natural aspect ratio so the entire picture
                 is shown end-to-end. */
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'cover',
              backgroundColor: 'transparent',
            }}
          />
          <CardContent>
            <Typography
              color="textPrimary"
              gutterBottom
              variant="h5"
              component="h2"
            >
              {heading}
            </Typography>
            <Typography color="textPrimary" variant="body2" component="p">
              {description}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Link>
    </CardContainer>
  );
};

export default Tip;
