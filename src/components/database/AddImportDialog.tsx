/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import Typography from '@mui/material/Typography';
import { Box, ButtonBase, Dialog, Grid, TextField } from '@mui/material';
import { ButtonNeutral, ButtonYes, DialogContainer, HorizontalDivider } from '../../styles/CommonStyles';
import styled from 'styled-components';
import CloseMenuIcon from '@mui/icons-material/Close';
import { useDispatch } from 'react-redux';
import { addSchema } from '../../store/databases/action';
import { Autocomplete } from '@mui/material';
import appIcons from '../../styles/app-icons';
import { IconDropdown } from '../commons/IconDropdown';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { LitAutocomplete } from '../lit-elements/LitElements';

const AddImportDialogContainer = styled(Dialog)`
  width: 50vw;
  height: 100%;
  margin-left: 25vw;

  .option-container {
    border: 1px solid #AFAFAF;
    border-radius: 5px;
    padding: 15px 30px;
    display: flex;
    gap: 23px;
    align-items: center;
    background-color: #FFF;

    &:hover {
      cursor: pointer;
      background-color: #D5E0F3;
    }
  }
`

const DialogContentContainer = styled(Box)`
  width: 100%;
  height: 100%;
  padding: 30px 35px 35px 35px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  background-color: #FFF;

  .detail-title {
    font-size: 16px;
    font-weight: 600;
  }

  .back-button {
    width: fit-content;
    gap: 5px;

    &:hover {
      cursor: pointer:
    }
  }
`

const DialogActionsContainer = styled(Box)`
  width: 100%;
  height: 100%;
  padding: 30px 35px 25px 35px;
  display: flex;
  justify-content: end;
  gap: 20px;
`

interface AddImportDialogProps {
  open: boolean;
  handleClose: () => void;
}

const AddImportDialog: React.FC<AddImportDialogProps> = ({
  open,
  handleClose,
}) => {
  const { databases, availableDatabases } = useSelector((state: AppState) => state.databases);
  const [schemas, setSchemas] = useState([]) as any;

  const fileElement = document.createElement('input');

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);
  const [nsfPath, setNsfPath] = useState('');
  const [iconName, setIconName] = useState('beach');
  
  const [importFlag, setImportFlag] = useState(false)
  const [schemaName, setSchemaName] = useState('')
  
  const engineOptions = ['domino'];

  const dispatch = useDispatch();

  const autocompleteRef = useRef<any>(null)

  const SchemaFormSchema = Yup.object().shape({
    schemaName: Yup.string()
      .max(256, 'Schema name is too long (maximum is 256 characters).')
      .min(3, "Schema name should contain at least 3 characters.")
      .required('Schema name is required.')
      .test('First Character', 'Schema name must start with a letter', (val) => {
        // Build Issue: character must be converted to an int before the isNaN call
        let retval = false;
        if (val && val.length) {
          retval = isNaN(parseInt(val.charAt(0), 10));
        }
        return retval;
      })
      .test('Unique Schema Name', 'Schema name already exists in this database! Change the schema name or the database.', (val) => {
        if(schemas.includes(nsfPath + ':' + val)) return false
        else return true
      })
      .matches(/^[a-z0-9_]+$/g, "Schema name should only contain lowercase letters, numbers, and underscores."),
    description: Yup.string()
      .min(3, "Schema name should contain at least 3 characters.")
      .required('Please provide a short description about this schema!'),
    nsfPath: Yup.string()
      .required('Please select a database!')
      .test('Database Does Not Exist', 'Database does not exist!', (val) => {
        if(!(availableDatabases.map((database) => {return database.title}).includes(val))) {
          return false
        } else {
          return true
        }
      }),
  });

  const formik = useFormik({
    initialValues: {
      schemaName: '',
      description: '',
      nsfPath: '',
      formulaEngine: 'domino',
      icon: appIcons['beach'],
      iconName: 'beach',
      apiName: '',
      isActive: true,
      agents: [],
      views: [],
      forms: [],
      dqlAccess: true,
      dqlFormula: {
        formulaType: "domino",
        formula: "@True"
      },
      allowCode: true,
      openAccess: true,
      requireRevisionToUpdate: false,
      allowDecryption: true,
      owners: []
    },
    validateOnChange: true,
    validateOnBlur: true,
    validationSchema: SchemaFormSchema,
    onSubmit: (values) => {
      const newSchema = {
        ...values,
        schemaName: schemaName,
        apiName: schemaName,
        nsfPath: nsfPath,
        iconName: iconName,
        icon: appIcons[iconName],
      };
      dispatch(addSchema(newSchema, resetForm) as any);
      setIconName('beach');
      setNsfPath('');
      setImportDialogOpen(false);
      handleClose();
    }
  })

  const handleCloseDialog = () => {
    setImportDialogOpen(false);
    handleClose();
    setSchemaName('')
  }

  // create a hidden input element and click it to open file dialog
  const handleClickImport = () => {
    setImportFlag(true)
    fileElement.setAttribute('type', 'file');
    fileElement.setAttribute('accept', '.json');
    fileElement.addEventListener('change', readSchema);

    fileElement.style.display = 'none';
    document.body.appendChild(fileElement);

    fileElement.click();
  }

  const handleClickCreate = () => {
    setImportFlag(false)
    formik.setValues({
      schemaName: '',
      description: '',
      nsfPath: '',
      formulaEngine: 'domino',
      icon: appIcons['beach'],
      iconName: 'beach',
      apiName: '',
      isActive: true,
      agents: [],
      views: [],
      forms: [],
      dqlAccess: true,
      dqlFormula: {
        formulaType: "domino",
        formula: "@True"
      },
      allowCode: true,
      openAccess: true,
      requireRevisionToUpdate: false,
      allowDecryption: true,
      owners: []
    })
    setImportDialogOpen(true);
  }

  // use the File Reader to read file contents
  const readSchema = (e: any) => {
    const reader = new FileReader();
    reader.readAsText(e?.currentTarget.files[0]);

    reader.onloadend = () => {
      const schemaData = JSON.parse(String(reader.result));
      formik.setValues({
        ...schemaData,
        formulaEngine: schemaData.formulaEngine,
      });
      setIconName(schemaData.iconName);
      setSchemaName(schemaData.schemaName)

      // Set values of the web components
      if (autocompleteRef.current && autocompleteRef.current.shadowRoot) {
        const inputElement = autocompleteRef.current.shadowRoot.querySelector('input')
        if (inputElement) {
          inputElement.value = schemaData.nsfPath
        }
      }

      setImportDialogOpen(true);
      
      document.body.removeChild(fileElement);
    }
	};

  const handleClickBack = () => {
    setImportDialogOpen(false);
  }

  useEffect(() => {
    const schemas = databases.map((database) => {
      return database.nsfPath + ':' + database.schemaName;
    });
    setSchemas(schemas);
  }, [databases]);

  const handleSelectIcon = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseIconMenu = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    setSelectedIndex(index);
    setAnchorEl(null);
    const _iconName = Object.keys(appIcons)[index];
    setIconName(Object.keys(appIcons)[index]);
  };

  const handleSchemaNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newSchemaName = e.target.value;
    newSchemaName = newSchemaName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setSchemaName(newSchemaName)
    formik.values.schemaName = newSchemaName
  };

  const handleClickSaveSchema = async () => {
    if (autocompleteRef.current) {
      const inputElement = autocompleteRef.current.shadowRoot.querySelector('input')
      if (inputElement) {
        setNsfPath(inputElement.value)
        formik.values.nsfPath = inputElement.value
      }
    }
    formik.submitForm()
  };

  const resetForm = () => {
    formik.resetForm()
    setSchemaName('')
  }

  const BackArrow = (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M11.875 7.5H3.125" stroke="black" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7.5 11.875L3.125 7.5L7.5 3.125" stroke="black" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  )

  const InitialDialog = (
    <>
      <HorizontalDivider />
      <DialogContentContainer>
        <Box className='option-container' onClick={handleClickImport}>
          <img
            src={`data:image/svg+xml;base64, PHN2ZyB3aWR0aD0iMzkiIGhlaWdodD0iMzkiIHZpZXdCb3g9IjAgMCAzOSAzOSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgaWQ9InVwbG9hZCI+CjxwYXRoIGlkPSJWZWN0b3IiIGQ9Ik0zNC4xMjUgMjQuMzc1VjMwLjg3NUMzNC4xMjUgMzEuNzM3IDMzLjc4MjYgMzIuNTYzNiAzMy4xNzMxIDMzLjE3MzFDMzIuNTYzNiAzMy43ODI2IDMxLjczNyAzNC4xMjUgMzAuODc1IDM0LjEyNUg4LjEyNUM3LjI2MzA1IDM0LjEyNSA2LjQzNjQgMzMuNzgyNiA1LjgyNjkgMzMuMTczMUM1LjIxNzQxIDMyLjU2MzYgNC44NzUgMzEuNzM3IDQuODc1IDMwLjg3NVYyNC4zNzUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGlkPSJWZWN0b3JfMiIgZD0iTTI3LjYyNSAxM0wxOS41IDQuODc1TDExLjM3NSAxMyIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggaWQ9IlZlY3Rvcl8zIiBkPSJNMTkuNSA0Ljg3NVYyNC4zNzUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjwvZz4KPC9zdmc+Cg==`}
            alt="upload-icon"
            style={{
            color: '#000',
            width: '39px',
            height: '39px'
            }}
          />
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <Box style={{ fontWeight: '700', fontSize: '16px', padding: 0, margin: 0 }}>
              Import Schema
            </Box>
            <Box style={{ fontWeight: '400', fontSize: '14px', padding: 0, margin: 0 }}>
              Import new schema from file
            </Box>
          </Box>
        </Box>
        <Box className='option-container' onClick={handleClickCreate}>
          <img
            src={`data:image/svg+xml;base64, PHN2ZyB3aWR0aD0iNDMiIGhlaWdodD0iNDMiIHZpZXdCb3g9IjAgMCA0MyA0MyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgaWQ9InBsdXMtY2lyY2xlIj4KPHBhdGggaWQ9IlZlY3RvciIgZD0iTTIxLjUwMDcgMzkuNDE2N0MzMS4zOTU4IDM5LjQxNjcgMzkuNDE3MyAzMS4zOTUxIDM5LjQxNzMgMjEuNUMzOS40MTczIDExLjYwNDkgMzEuMzk1OCAzLjU4MzM3IDIxLjUwMDcgMy41ODMzN0MxMS42MDU1IDMuNTgzMzcgMy41ODM5OCAxMS42MDQ5IDMuNTgzOTggMjEuNUMzLjU4Mzk4IDMxLjM5NTEgMTEuNjA1NSAzOS40MTY3IDIxLjUwMDcgMzkuNDE2N1oiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGlkPSJWZWN0b3JfMiIgZD0iTTIxLjUgMTQuMzMzNFYyOC42NjY3IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBpZD0iVmVjdG9yXzMiIGQ9Ik0xNC4zMzQgMjEuNUgyOC42NjczIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L2c+Cjwvc3ZnPgo=`}
            alt="add-icon"
            style={{
            color: '#000',
            width: '39px',
            height: '39px'
            }}
          />
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <Box style={{ fontWeight: '700', fontSize: '16px', padding: 0, margin: 0 }}>
              Create Schema
            </Box>
            <Box style={{ fontWeight: '400', fontSize: '14px', padding: 0, margin: 0 }}>
              Create your own schema
            </Box>
          </Box>
        </Box>
      </DialogContentContainer>
    </>
  )

  const ImportDialog = (
    <>
      <HorizontalDivider />
      <DialogContentContainer>
        <ButtonBase onClick={handleClickBack} className='back-button'>
          {BackArrow}
          Back
        </ButtonBase>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Typography className='detail-title'>
            {`${importFlag ? "Import Into Database" : "Database"}`}
          </Typography>
          <LitAutocomplete
            options={availableDatabases.map((database) => database.title)}
            ref={autocompleteRef}
            error={!!formik.errors.nsfPath && formik.touched.nsfPath}
            errorMessage={formik.errors.nsfPath}
            initialOption={formik.values.nsfPath}
          />
        </Box>
      </DialogContentContainer>
      <HorizontalDivider />
      <DialogContentContainer>
        <Box style={{ display: 'flex', flexDirection: 'row' }} sx={{ bgcolor: '#FFF' }}>
          <Box style={{ flexDirection: 'row', width: '40%' }} sx={{ bgcolor: '#FFF' }}>
            <Typography className='detail-title'>
              Icon
            </Typography>
            <Box sx={{ bgcolor: '#FFF' }}>
              <IconDropdown
                handleSelectIcon={handleSelectIcon}
                displayIconName={iconName}
                anchorEl={anchorEl}
                handleClose={handleCloseIconMenu}
                selectedIndex={selectedIndex}
                handleMenuItemClick={handleMenuItemClick}
                size={45}
              />
            </Box>
          </Box>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '60%' }} sx={{ bgcolor: '#FFF' }}>
            <Typography className='detail-title'>
              Schema Name
            </Typography>
            <Box style={{ height: '41px' }} sx={{ bgcolor: '#FFF' }}>
              <TextField 
                onChange={handleSchemaNameChange} 
                error={!!formik.errors.schemaName && formik.touched.schemaName}
                helperText={formik.errors.schemaName}
                name='schemaName'
                variant='outlined' 
                value={schemaName} 
                placeholder='Schema Name' 
                style={{ maxHeight: '41px', width: '100%' }} 
              />
            </Box>
          </Box>
        </Box>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '5px' }} sx={{ bgcolor: '#FFF' }}>
          <Typography className='detail-title'>
            Schema Description
          </Typography>
          <TextField 
            onChange={(e) => {formik.handleChange(e)}} 
            error={!!formik.errors.description && formik.touched.description}
            helperText={formik.errors.description}
            name='description'
            variant='outlined' 
            value={formik.values.description} 
            placeholder='Description' 
            multiline={true}
            minRows={5}
            style={{ width: '100%', overflowY: 'scroll' }} 
          />
        </Box>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '5px' }} sx={{ bgcolor: '#FFF' }}>
          <Typography className='detail-title'>
            Formula Engine
          </Typography>
          <Autocomplete
            id="choose-engine"
            options={engineOptions}
            value="Domino"
            getOptionLabel={engine => engine}
            fullWidth
            renderInput={(params) => <TextField {...params} name='formulaEngine' value={formik.values.formulaEngine} variant='outlined' fullWidth />}
            style={{ margin: 0, padding: 0, zIndex: 100 }}
          />
        </Box>
      </DialogContentContainer>
      <HorizontalDivider />
      <DialogActionsContainer sx={{ bgcolor: '#FFF' }}>
        <ButtonNeutral onClick={handleClickBack}>Back</ButtonNeutral>
        <ButtonYes onClick={handleClickSaveSchema}>Save Schema</ButtonYes>
      </DialogActionsContainer>
    </>
  )

  const Title = (
    <>
      <div className='title' style={{ display: 'flex', flexDirection: 'row' }}>
        <div style={{ width: '90%', padding: '20px 25px 15px 25px', fontWeight: 'normal', fontSize: '20px' }}>
          {!importDialogOpen && `Add New Schema`}
          {importDialogOpen && `${importFlag ? "Import Schema" : "Create Schema"}`}
        </div>
        <div style={{ width: '10%', paddingTop: '20px', cursor: 'pointer' }}>
          <CloseMenuIcon onClick={handleCloseDialog} />
        </div>
      </div>
    </>
  )

  return (
    <>
      <AddImportDialogContainer open={open} onClose={handleCloseDialog} PaperProps={{ style: { borderRadius: '10px', maxHeight: '95vh' }}}>
        <DialogContainer sx={{ borderRadius: '10px', overflowY: 'auto' }}>
          {Title}
          {!importDialogOpen && InitialDialog}
          {importDialogOpen && ImportDialog}
        </DialogContainer>
      </AddImportDialogContainer>
    </>
  );
};

export default AddImportDialog;
