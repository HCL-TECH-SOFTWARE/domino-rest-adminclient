/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';

export const FormContainer = styled.div`
  padding: 0 0px;
  display: block;
  justify-content: center;
  align-items: center;

  .button-create {
    margin: 10px 0;
    background-color: var(--wa-color-brand-50);
    float: right;
    color: white;
  }
`;

export const StackContainer = styled.div`
  display: flex;
  padding: 0 0px;
  flex-direction: column;
  margin: 2% 2%;

  .heading {
    font-size: 16px;
    font-weight: 500;
    margin: 3px 0;
    margin-right: 5px;
  }
`;

export const Flex = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

export const StackCards = styled.div`
  width: 100%;
  height: calc(100vh - 190px);
  overflow-y: auto;
`;

export const PanelInfo = styled.div`
  font-size: 18px;
  padding: 0px 10px;
  min-height: 48px;
  border: 2px solid var(--wa-color-brand-50);
  border-radius: var(--wa-border-radius-l);
  display: flex;
  cursor: pointer;
  align-items: center;
`;

export const PanelHeader = styled.div`
  font-size: 18px;
  padding: 0px 10px;
  height: 48px;
  border-bottom: 2px solid lightgray;
  display: flex;
  cursor: pointer;
  align-items: center;
  background-color: #f9fbff;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Panelcontent = styled.div`
  display: flex;
  cursor: pointer;
`;

export const PanelText = styled.div`
  cursor: pointer;
  width: 81%;
`;

export const PanelButton = styled.div`
  cursor: pointer;
  text-transform: capitalize;
  float: right;
`;

export const TopNavigator = styled.div`
  display: flex;
  padding: 25px 0;
  gap: 10px;
`;

export const ActionHeader = styled.div`
  margin-top: 20px;
  display: block;
  flex-direction: column;
  width: 100%;
`;

export const PageTitle = styled.div`
  flex: 1;
  display: flex;
  align-items: center;

  .title {
    margin-left: 5px;
    font-size: var(--wa-font-size-xl);
    font-weight: 500;
  }
`;

export const SubSectionTitleContainer = styled.div`
  height: 100px;
  display: flex;
  align-items: center;

  .title {
    font-size: 24px;
    font-weight: 700;
  }
`;

export const AutoContainer = styled.div`
  margin: 20px 0;
`;

export const TopBanner = styled.div`
  width: 100%;
  height: 100px;
  padding: 20px 20px 0px 0px;
  vertical-align: middle;
  font-size: 16px;
  color: var(--wa-color-text-normal);
`;

export const Title = styled.div`
  .message {
    font-size: 20px;
  }
`;

export const PanelContent = styled.form`
  padding: 20px 0;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  width: 100%;

  .appIcon {
    background: var(--wa-color-brand-50);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    margin-right: 5px;

    svg {
      font-size: 20px;
    }
  }
`;

export const MainPanel = styled.div`
  padding-left: 35px;
  margin: 0px;
  width: 100%;
`;

export const PageLegend = styled.div`
  margin-top: 20px;
  font-size: 18px;
`;

export const Content = styled.div`
  font-size: 16px;
`;

export const Alias = styled.div`
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Footer = styled.div`
  display: flex;
  align-items: center;

  .heading {
    font-weight: 300;
    font-size: var(--wa-font-size-m);
    margin-right: 5px;
  }

  .app-secret {
    font-size: var(--wa-font-size-m);
    cursor: pointer;
  }
`;

export const Action = styled.div`
  svg {
    font-size: 18px;
    cursor: pointer;
    margin: 0 3px;
    float: right;
  }
`;

export const ActionButtonBar = styled.div`
  margin-top: 0px;
  border-top: 2px solid var(--wa-color-brand-50);
  padding-top: 15px;
  padding-bottom: 15px;
  display: flex;
  flex-wrap: wrap;
  row-gap: 10px;
`;

export const TopContainer = styled.div`
  margin-top: 20px;
  display: flex;
  padding: 15px 0;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;

  .button-create {
    background-color: var(--wa-color-brand-50);
    color: white;
  }
  .top-nav {
    display: flex;
    flex: 1; 
    font-size: 24px;
    font-weight: bold;
  }
  .button-compare {
    display: inline-flex;
    padding: 11px 24px;
    right: 0;
    gap: 10px;
    border-radius: var(--wa-border-radius-l);
    background-color: #5E1EBE;
    text-transform: none;
    top: 8px;
  }
  .compare-disabled {
    background-color: #E6EBF5;
  }

`;

export const FilterContainer = styled.div`
  margin-top: 5px;
  margin-bottom: 25px;
  display: flex;

  .switchStyle {
    color: #556cd6;

    & .MuiSwitch-switchBase.Mui-checked {
      color: green;
    }

    & .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track {
      background-color: lightblue;
    }
  }
`;

export const ErrorContainer = styled.div`
  height: calc(100vh - 23px);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .image-error {
    height: 250px;
  }
`;
