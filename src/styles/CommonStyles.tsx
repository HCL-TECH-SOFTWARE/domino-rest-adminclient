/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';
import Card from '@mui/material/Card';
import { KEEP_ADMIN_BASE_COLOR } from '../config.dev';
import { getTheme } from '../store/styles/action';
import { Box, Button, Dialog, Radio, RadioProps, Switch } from '@mui/material';

export const FormContainer = styled.div`
  padding: 0 0px;
  display: block;
  justify-content: center;
  align-items: center;

  .button-create {
    margin: 10px 0;
    background-color: ${KEEP_ADMIN_BASE_COLOR};
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
  border: 2px solid ${KEEP_ADMIN_BASE_COLOR};
  border-radius: 10px;
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
    font-size: 22px;
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

export const FormSearchContainer = styled('div')<{ theme: string }>`
  display: flex;
  flex: 1;
  height: 43px;
  justify-content: center;
  border: 1px solid ${(props) => getTheme(props.theme).borderColor};
  border-radius: 10px !important;
  background: ${(props) => getTheme(props.theme).secondary} !important;

  .search-icon {
    margin-left: 10px;
    font-size: 19px;
  }
  .clear-icon {
    font-size: 19px;
    cursor: pointer;
  }
`;

export const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 0px;
  width: 100%;
`;

export const SearchInput = styled.input`
  border: 0;
  width: 100%;
  outline: none;
  background: none;
  font-size: 16px;
`;

export const TopBanner = styled.div`
  width: 100%;
  height: 100px;
  padding: 20px 20px 0px 0px;
  vertical-align: middle;
  font-size: 16px;
  color: black;
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
    background: ${KEEP_ADMIN_BASE_COLOR};
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

export const DrawerFormContainer = styled.div`
  width: 50vw;
  @media only screen and (max-width: 768px) {
    width: 100vw;
  }
`;

export const FormContentContainer = styled.div`
  padding: 0px 20px;
  width: 55%;

  .header-title {
    margin-top: 15px;
    color: white;
    font-size: 24px;
    padding: 20px;
    height: 70x;
    border-radius: 5px;
  }

  .button-style {
    height: 10%;
    width: 25%;
    background-color: ${KEEP_ADMIN_BASE_COLOR};
    float: right;
    color: white;
    margin-left: 20px;
  }

  .button-style2 {
    height: auto;
    width: 20px !important;
    max-width: 20px !important;
    background-color: ${KEEP_ADMIN_BASE_COLOR};
    color: white;
    padding: 0;
    border-radius: 2px;
  }

  .button-disabled {
    background-color: rgba(0, 0, 0, 0.26);
  }

  .button-small {
    font-size: 12px;
    height: 9%;
    margin: 15px 3px 5px 3px;
    background-color: ${KEEP_ADMIN_BASE_COLOR};
    color: white;
  }
  .bold-text {
    font-weight: 700;
  }
  .float-right {
    float: right;
  }
  .validation-error {
    color: #e53935;
  }
  .icon-select {
    text-transform: capitalize;
    color: #000;
  }
  .form-heading {
    font-size: 26px;
    margin-top: 20px;
    font-weight: 500;
  }
  .icon-heading {
    font-size: 14px;
  }
  .icon-image {
    width: 35px;
    margin-right: 15px;
  }
`;

export const CardContainer = styled(Card)<{}>`
  width: 18%;
  min-width: 250px;
  height: 185px;
  padding: 4px 16px;
  margin: 10px 15px 15px 0px;
  border-radius: 10px !important;
  position: relative;

  .generating {
    font-size: 14px;
  }

  .actions {
    visibility: hidden;

    .generate {
      margin-right: 2px;
    }
  }

  .appName {
    flex: 1;
    font-size: 16px;
    font-weight: 500;
    overflow-x: hidden;
    text-overflow: ellipsis;
    max-height: 30px;
    white-space: nowrap;
  }

  .appDescription {
    flex: 1;
    font-size: 12px;
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media only screen and (max-width: 1366px) {
    width: 250px !important;
  }
  
  .footer-actions {
    min-height: 26px;
  }

  &:hover {
    .actions {
      visibility: visible;
    }

    .footer-actions {
      visibility: visible;
    }
    user-select: none;
    cursor: pointer;
  }

  &:focus {
    .actions {
      visibility: visible;
    }

    .footer-actions {
      visibility: visible;
    }
    user-select: none;
  }

  &:hover {
    border: 1px solid ${(props) => getTheme(props.theme.palette.mode).hoverColor};

    .more {
      visibility: visible;
    }
  }

  &:focus {
    border: 1px solid ${(props) => getTheme(props.theme.palette.mode).hoverColor};

    .more {
      visibility: visible;
    }
  }
`;

export const FilterContainer = styled.div`
  margin-top: 5px;
  margin-bottom: 25px;
  display: flex;


  .switchStyle = {
    color: "#556cd6",
    "& .MuiSwitch-switchBase.Mui-checked": {
      color: 'green'
    },
    "& .MuiSwitch-switchBase.Mui-checked+.MuiSwitch-track": {
      backgroundColor: 'lightBlue'

    }
  }
}

`;
export const TopContainer = styled.div`
  margin-top: 20px;
  display: flex;
  padding: 15px 0;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;

  .button-create {
    background-color: ${KEEP_ADMIN_BASE_COLOR};
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
    border-radius: 10px;
    background-color: #5E1EBE;
    text-transform: none;
    top: 8px;
  }
  .compare-disabled {
    background-color: #E6EBF5;
  }

`;
interface ContainerProps {
  theme: string;
  $active: boolean;
}

export const Container = styled(Card)<ContainerProps>`
  width: 30%;
  height: 120px;
  margin: 0 15px 15px 0px;
  border-radius: 10px !important;
  box-shadow: 2px 2px 5px
    ${(props) => (props.$active ? '#1966b3' : 'lightgray')};
  color: ${(props) => (props.$active ? '#1966b3' : '#383838')};
  background: ${(props) => getTheme(props.theme).secondary} !important;
  cursor: pointer;
  user-select: none;

  &:hover {
    border: 1px solid ${(props) => getTheme(props.theme).hoverColor};
  }
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

export const InputContainer = styled.div`
  padding: 5px 0;
  .launch {
    background-color: ${KEEP_ADMIN_BASE_COLOR};
    color: white;
    font-size: 10px;
  }
  .launchdisabled {
    background-color: lightgray;
    color: white;
    font-size: 10px;
  }
`;

export const ModeLogo = styled.div`
  margin: 0;
  padding: 0;
  
  svg {
    height: 44px;
    width: 44px;
    border-radius: 50%;
  }
`;

export const Footer = styled.div`
  display: flex;
  align-items: center;

  .heading {
    font-weight: 300;
    font-size: 13px;
    margin-right: 5px;
  }

  .app-secret {
    font-size: 13px;
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
  border-top: 2px solid ${KEEP_ADMIN_BASE_COLOR};
  padding-top: 15px;
  display: flex;
  flex-wrap: wrap;
  row-gap: 10px;
`;

export const PageLegend = styled.div`
  margin-top: 20px;
  font-size: 18px;
`;

export const MainPanel = styled.div`
  padding-left: 35px;
  margin: 0px;
  width: 100%;
`;

export const DrawerContainer = styled.div`
  display: block;
  justify-content: center;
  align-items: center;
  padding: 15px 30px;
  width: 100%;

  .float-right {
    float: right;
  }

  .header-title {
    background-color: ${KEEP_ADMIN_BASE_COLOR};
    margin: 30px 0 10px 0;
    font-size: 20px;
    padding: 10px;
    border-radius: 5px;
  }
`;

export const OptionsIcon = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
`;

export const Options = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  margin-bottom: 10px;
  position: relative;
  right: 5px;

  svg {
    visibility: hidden;
  }
`;
export const OptionList = styled.div`
  .option-item {
    padding: 0 10px;
  }
`;

export const MenuOptionsContainer = styled.div<{ theme: string }>`
  padding: 10px 0px 0px 0px;

  .left-icon {
    font-size: 16px;
    margin-left: 10px;
  }

  .right-icon {
    font-size: 16px;
  }

  .MuiListItemAvatar-root {
    margin-right: 10px;
    min-width: 20px;
  }

  .MuiList-padding {
    padding-bottom: 0 !important;
  }

  .MuiListItem-root {
    padding: 6px 5px !important;
    cursor: pointer;
    &:hover {
      background: ${(props) => getTheme(props.theme).hoverColor};
      color: ${(props) => getTheme(props.theme).primary};

      .right-icon {
        color: ${(props) => getTheme(props.theme).hoverColor} !important;
      }
    }
  }

  .MuiTypography-body1 {
    font-size: 14px;
  }
`;

export const Buttons = styled.div`
  display: inline;

  .btn {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 6px 16px;
    gap: 5px;
    position: absolute;
    width: 93px;
    height: 31px;
    text-transform: none;

    border-radius: 3px;
    line-height: 19px;
  }

  .text {
    margin-left: 5px;
  }

  .save {
    text-transform: none;
    border-radius: 3px;
    line-height: 19px;
    background-color: #0F5FDC;
    color: #FFFFFF;
  }

  .cancel {
    text-transform: none;
    border: 1px solid;
    border-radius: 3px;
    line-height: 19px;
  }
`

export const ButtonYes = styled(Button)<{ theme: string }>`
  padding: 6px 16px;
  min-width: 93px;
  height: 31px;
  text-transform: none;
  border-radius: 3px;
  line-height: 19px;
  background-color: #0F5FDC;
  color: #FFFFFF;

  &:hover {
    background-color: #0B4AAE;
    color: #FFFFFF;
  }

  &:disabled {
    background-color: #96BCF8;
    color: #0C0D0D
  }
`

export const ButtonNeutral = styled(Button)`
  padding: 6px 16px;
  min-width: 93px;
  height: 31px;
  text-transform: none;
  border-radius: 3px;
  line-height: 19px;
  border: 1px solid;
`

export const ButtonNo = styled(Button)`
  padding: 6px 16px;
  min-width: 93px;
  height: 31px;
  text-transform: none;
  border-radius: 3px;
  line-height: 19px;
  background-color: #F01648;
  color: #FFFFFF;

  &:hover {
    background-color: #F01648;
    color: #FFFFFF;
  }
`

export const SchemaIconStatus = styled.div`
  width: 10px;
  height: 10px;
  background-position: top right;
  background-repeat: no-repeat;
  background-size: contain;
`;

export const InUseSymbol = `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjYiIGZpbGw9IiM4MkRDNzMiLz4KPC9zdmc+Cg==')`
export const NotInUseSymbol = `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjYiIGZpbGw9IiNENjQ2NkYiLz4KPC9zdmc+Cg==")`

export const BlueSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#3874cb',
    '&:hover': {
      backgroundColor: '#9cbae5',
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#3874cb',
  },
}));

export const DeleteIcon = styled.div`
  width: 20px;
  height: 20px;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRkZERUVBIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRkZERUVBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRkZERUVBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');
  background-position: top right;
  background-repeat: no-repeat;
  background-size: contain;
  &:hover {
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5IDZWMjBDMTkgMjAuNTMwNCAxOC43ODkzIDIxLjAzOTEgMTguNDE0MiAyMS40MTQyQzE4LjAzOTEgMjEuNzg5MyAxNy41MzA0IDIyIDE3IDIySDdDNi40Njk1NyAyMiA1Ljk2MDg2IDIxLjc4OTMgNS41ODU3OSAyMS40MTQyQzUuMjEwNzEgMjEuMDM5MSA1IDIwLjUzMDQgNSAyMFY2TTggNlY0QzggMy40Njk1NyA4LjIxMDcxIDIuOTYwODYgOC41ODU3OSAyLjU4NTc5QzguOTYwODYgMi4yMTA3MSA5LjQ2OTU3IDIgMTAgMkgxNEMxNC41MzA0IDIgMTUuMDM5MSAyLjIxMDcxIDE1LjQxNDIgMi41ODU3OUMxNS43ODkzIDIuOTYwODYgMTYgMy40Njk1NyAxNiA0VjYiIGZpbGw9IiNENjQ2NkYiLz4KPHBhdGggZD0iTTE5IDZWMjBDMTkgMjAuNTMwNCAxOC43ODkzIDIxLjAzOTEgMTguNDE0MiAyMS40MTQyQzE4LjAzOTEgMjEuNzg5MyAxNy41MzA0IDIyIDE3IDIySDdDNi40Njk1NyAyMiA1Ljk2MDg2IDIxLjc4OTMgNS41ODU3OSAyMS40MTQyQzUuMjEwNzEgMjEuMDM5MSA1IDIwLjUzMDQgNSAyMFY2TTggNlY0QzggMy40Njk1NyA4LjIxMDcxIDIuOTYwODYgOC41ODU3OSAyLjU4NTc5QzguOTYwODYgMi4yMTA3MSA5LjQ2OTU3IDIgMTAgMkgxNEMxNC41MzA0IDIgMTUuMDM5MSAyLjIxMDcxIDE1LjQxNDIgMi41ODU3OUMxNS43ODkzIDIuOTYwODYgMTYgMy40Njk1NyAxNiA0VjYiIHN0cm9rZT0iI0Q2NDY2RiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPG1hc2sgaWQ9InBhdGgtMy1vdXRzaWRlLTFfMjc4XzEzNzMiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjIiIHk9IjUiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayI+CjxyZWN0IGZpbGw9IndoaXRlIiB4PSIyIiB5PSI1IiB3aWR0aD0iMjAiIGhlaWdodD0iMiIvPgo8cGF0aCBkPSJNMyA2SDVIMjEiLz4KPC9tYXNrPgo8cGF0aCBkPSJNMyA2SDVIMjEiIGZpbGw9IiNENjQ2NkYiLz4KPHBhdGggZD0iTTMgNUMyLjQ0NzcyIDUgMiA1LjQ0NzcyIDIgNkMyIDYuNTUyMjggMi40NDc3MiA3IDMgN1Y1Wk0yMSA3QzIxLjU1MjMgNyAyMiA2LjU1MjI4IDIyIDZDMjIgNS40NDc3MiAyMS41NTIzIDUgMjEgNVY3Wk0zIDdINVY1SDNWN1pNNSA3SDIxVjVINVY3WiIgZmlsbD0id2hpdGUiIG1hc2s9InVybCgjcGF0aC0zLW91dHNpZGUtMV8yNzhfMTM3MykiLz4KPG1hc2sgaWQ9InBhdGgtNS1vdXRzaWRlLTJfMjc4XzEzNzMiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayI+CjxyZWN0IGZpbGw9IndoaXRlIiB4PSIzIiB5PSI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMiIvPgo8cGF0aCBkPSJNNCA1TDUuNzc3NzggNUwyMCA1Ii8+CjwvbWFzaz4KPHBhdGggZD0iTTQgNUw1Ljc3Nzc4IDVMMjAgNSIgZmlsbD0iI0Q2NDY2RiIvPgo8cGF0aCBkPSJNNCA0QzMuNDQ3NzIgNCAzIDQuNDQ3NzIgMyA1QzMgNS41NTIyOCAzLjQ0NzcyIDYgNCA2TDQgNFpNMjAgNkMyMC41NTIzIDYgMjEgNS41NTIyOSAyMSA1QzIxIDQuNDQ3NzIgMjAuNTUyMyA0IDIwIDRMMjAgNlpNNCA2TDUuNzc3NzggNkw1Ljc3Nzc4IDRMNCA0TDQgNlpNNS43Nzc3OCA2TDIwIDZMMjAgNEw1Ljc3Nzc4IDRMNS43Nzc3OCA2WiIgZmlsbD0iI0Q2NDY2RiIgbWFzaz0idXJsKCNwYXRoLTUtb3V0c2lkZS0yXzI3OF8xMzczKSIvPgo8L3N2Zz4K')!important;
  }
`;

export const CommonDialog = styled(Dialog)`
  flex-direction: row;
  padding: 0;
  margin: 0;

  .title {
    flex: 1;
    text-overflow: ellipsis;
    width: 100%;
    overflow: hidden;
    font-size: 24px;
    font-weight: bold;
  }

  .btn {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 6px 16px;
    gap: 5px;
    position: absolute;
    width: 93px;
    height: 31px;
    text-transform: none;

    border-radius: 3px;
    line-height: 19px;
  }

  .save {
    text-transform: none;
    border-radius: 3px;
    line-height: 19px;
    background-color: #0F5FDC;
    color: #FFFFFF;
  }

  .cancel {
    text-transform: none;
    border: 1px solid;
    border-radius: 3px;
    line-height: 19px;
  }
`

export const DialogContainer = styled(Box)`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 0;
  margin: 0;
  vertical-align: middle;
  width: 100%;
  height: 100%;

  .title {
    display: flex;
    text-overflow: ellipsis;
    width: 100%;
    overflow: hidden;
    font-size: 24px;
    font-weight: bold;
    flex-direction: row;
  }

  .btn {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 6px 16px;
    gap: 5px;
    position: absolute;
    min-width: 93px;
    height: 31px;
    text-transform: none;

    border-radius: 3px;
    line-height: 19px;
  }

  .right {
    right: calc(93px + 10px);
  }

  .text {
    margin-left: 5px;
  }

  .save {
    text-transform: none;
    border-radius: 3px;
    line-height: 19px;
    background-color: #0F5FDC;
    color: #FFFFFF;
  }

  .cancel {
    text-transform: none;
    border: 1px solid;
    border-radius: 3px;
    line-height: 19px;
  }

  .actions {
    width: 100%;
    align-items: flex-end;
    padding-right: 30px;
  }
`

export const SideNavContainer = styled.div`
  width: 242;
  flex-shrink: 0;
  white-space: nowrap;

  .drawer {
    width: 242px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .open {
    transition: width 225ms ease-in;
    
    @media only screen and (min-width: 0px) and (max-width: 768px) {
      width: 80%;
    }
  }

  .close {
    transition: width 195ms ease-in;
    overflow-x: hidden;
    width: 57px;
    background-color: yellow;

    @media only screen and (min-width: 0px) and (max-width: 768px) {
      width: 0;
    }
  }
`

export const HorizontalDivider = () => {return (
  <Box style={{ width: '100%', padding: 0, margin: 0 }}>
    <hr color='#C8D2DD' style={{ height: 1 }} />
  </Box>
)}

export const WarningIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35" fill="none">
      <g clip-path="url(#clip0_2139_16855)">
        <path d="M17.5 0C7.83594 0 0 7.83594 0 17.5C0 27.1641 7.83594 35 17.5 35C27.1641 35 35 27.1641 35 17.5C35 7.83594 27.1641 0 17.5 0ZM17.5 32.0312C9.47656 32.0312 2.96875 25.5234 2.96875 17.5C2.96875 9.47656 9.47656 2.96875 17.5 2.96875C25.5234 2.96875 32.0312 9.47656 32.0312 17.5C32.0312 25.5234 25.5234 32.0312 17.5 32.0312Z" fill="#D6466F"/>
        <path d="M15.625 24.375C15.625 24.8723 15.8225 25.3492 16.1742 25.7008C16.5258 26.0525 17.0027 26.25 17.5 26.25C17.9973 26.25 18.4742 26.0525 18.8258 25.7008C19.1775 25.3492 19.375 24.8723 19.375 24.375C19.375 23.8777 19.1775 23.4008 18.8258 23.0492C18.4742 22.6975 17.9973 22.5 17.5 22.5C17.0027 22.5 16.5258 22.6975 16.1742 23.0492C15.8225 23.4008 15.625 23.8777 15.625 24.375ZM16.5625 20H18.4375C18.6094 20 18.75 19.8594 18.75 19.6875V9.0625C18.75 8.89062 18.6094 8.75 18.4375 8.75H16.5625C16.3906 8.75 16.25 8.89062 16.25 9.0625V19.6875C16.25 19.8594 16.3906 20 16.5625 20Z" fill="#D6466F"/>
      </g>
      <defs>
        <clipPath id="clip0_2139_16855">
          <rect width="35" height="35" fill="white"/>
        </clipPath>
      </defs>
    </svg>
)}

export const StyledRadio = styled(Radio)<RadioProps>`
  color: #0E5FDC;
  &.Mui-checked {
    color: #0E5FDC;
  }
  .MuiRadio-label {
    padding: 0;
    font-size: 14px;
  }
`;

export const EncryptSignOptions = styled.section`
  width: 45%;
  font-size: 14px;

  .main-row {
    display: flex;
  }

  .warning-text {
    color: #616161;
    font-size: 12px;
  }
`