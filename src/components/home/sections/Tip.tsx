/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Typography from '@material-ui/core/Typography';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getTheme } from '../../../store/styles/action';
import { AppState } from '../../../store';

const CardContainer = styled(Card)<{ theme: string; bg: string }>`
  flex: 1;
  background: ${props => getTheme(props.theme).secondary} !important;
  margin-left: 8px;
  margin-right: 8px;
  border-radius: 8px !important;

  @media only screen and (max-width: 768px) {
    margin-right: 0;
  }

  .link {
    text-decoration: none;
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
            style={{ height: 220 }}
            image={backgroungImage}
            title={description}
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
