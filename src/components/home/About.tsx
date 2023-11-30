/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import barbicantitle from './barbicantitle.jpg';

const AboutContainer = styled.div<{ theme: string }>`
  padding: 0 20px;
  justify-content: center;
  display: flex;
  flex-direction: column;

  .title {
    margin-left: 8px;
    margin-right: 8px;
    overflow: hidden;
  }

  .barbican {
    width: 100%;
    height: 100%;
    border: 1px solid white;
    border-radius: 10px !important;
  }
`;

const About = () => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  return (
    <AboutContainer theme={themeMode}>
      <span className="title">
        <img
          className="barbican"
          src={barbicantitle}
          alt="HCL Domino REST API Administrator"
        />
      </span>
    </AboutContainer>
  );
};

export default About;
