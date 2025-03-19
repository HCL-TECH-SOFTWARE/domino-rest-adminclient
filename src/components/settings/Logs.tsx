/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useEffect, useState } from 'react';
import styled from 'styled-components';

const LogsContainer = styled.div`
  background: black;
  padding: 0 10px;
  color: white;
  height: 100vh;
  width: calc(100vw - 351px);
  overflow-y: auto;
  overflow-x: auto;
`;

const Logs = () => {
  const [log, setLog] = useState('');

  useEffect(() => {
    const getLog = async () => {
      const response = await fetch('https://cors-anywhere.herokuapp.com/http://frascati.projectkeep.io:8009/log')
      const data = await response.json()
      setLog(data)
    }
    getLog()
  }, []);

  return (
    <LogsContainer>
      <pre>{log}</pre>
    </LogsContainer>
  );
};

export default Logs;
