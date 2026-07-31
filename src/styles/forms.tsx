/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';
import { Radio, RadioProps, Switch } from '@mui/material';

export const InputContainer = styled.div`
  padding: 5px 0;
  .launch {
    background-color: var(--wa-color-brand-50);
    color: white;
    font-size: var(--wa-font-size-2xs);
  }
  .launchdisabled {
    background-color: lightgray;
    color: white;
    font-size: var(--wa-font-size-2xs);
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

    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
  }

  .text {
    margin-left: 5px;
  }

  .save {
    text-transform: none;
    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
    background-color: #0F5FDC;
    color: #FFFFFF;
  }

  .cancel {
    text-transform: none;
    border: 1px solid;
    border-radius: var(--wa-border-radius-s);
    line-height: 19px;
  }
`

export const BlueSwitch = styled(Switch)`
  & .MuiSwitch-switchBase.Mui-checked {
    color: #3874cb;
    &:hover {
      background-color: #9cbae5;
    }
  }
  & .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track {
    background-color: #3874cb;
  }
`;

export const StyledRadio = styled(Radio)<RadioProps>`
  color: #0E5FDC;
  &.Mui-checked {
    color: #0E5FDC;
  }
  .MuiRadio-label {
    padding: 0;
    font-size: var(--wa-font-size-m);
  }
`;

export const EncryptSignOptions = styled.section`
  width: 45%;
  font-size: var(--wa-font-size-m);

  .main-row {
    display: flex;
  }

  .warning-text {
    color: #616161;
    font-size: var(--wa-font-size-s);
  }
`

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
