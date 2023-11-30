/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';

const Loader = styled.div`
  display: flex;
  height: calc(100vh - 100px);
  position: absolute;
  flex-direction: column;
  width: 100%;
  left: 0;
  flex: 1;
  align-items: center;
  justify-content: center;

  @media only screen and (max-width: 768px) {
    background: white;
  }

  .lds-ellipsis {
    display: flex;
    position: relative;
    height: 30px;
    justify-content: center;
    align-items: center;
  }
  .lds-ellipsis div {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #1966b3;
    animation-timing-function: cubic-bezier(0, 1, 1, 0);
  }
  .lds-ellipsis div:nth-child(1) {
    left: 8px;
    animation: lds-ellipsis1 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(2) {
    left: 28px;
    animation: lds-ellipsis2 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(3) {
    left: 32px;
    animation: lds-ellipsis2 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(4) {
    left: 56px;
    animation: lds-ellipsis3 0.6s infinite;
  }
  @keyframes lds-ellipsis1 {
    0% {
      transform: scale(0);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes lds-ellipsis3 {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(0);
    }
  }
  @keyframes lds-ellipsis2 {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(24px, 0);
    }
  }
`;

interface PageLoadingProps {
  message: string;
}

const PageLoading: React.FC<PageLoadingProps> = ({ message }) => {
  return (
    <Loader>
      <div className="lds-ellipsis">
        <div />
        <div />
        <div />
        <div />
      </div>
      <p>{message}</p>
    </Loader>
  );
};

export default PageLoading;
