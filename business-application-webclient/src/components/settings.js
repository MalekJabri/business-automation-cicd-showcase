import "@patternfly/react-core/dist/styles/base.css";
import isEmpty from 'validator/lib/isEmpty';
import KieClient from './kieClient';
import './fonts.css';

import React from 'react';
import {
  Form,
  FormGroup,
  FormSection,
  TextInput,
  ValidatedOptions,
  FormSelectOption,
  FormSelect,
  ActionGroup,
  Button,
  Radio,
  Divider,
  Alert, 
  AlertActionCloseButton,
  Modal,
  TextContent,
  Text,
  TextVariants,
  TextList,
  TextListVariants,
  TextListItem,
  TextListItemVariants,
} from '@patternfly/react-core';
import { BorderNoneIcon } from '@patternfly/react-icons';
import { loadFromLocalStorage } from './util'

class SettingsForm extends React.Component {
  constructor(props) {
    super(props);

    const kieSettings = loadFromLocalStorage('kieSettings', true);
    this.state = {
      common: {
        kieServerBaseUrl: kieSettings?.common ? kieSettings.common.kieServerBaseUrl : '',
        kieServerUser: kieSettings?.common ? kieSettings.common.kieServerUser : '',
        kieServerPassword: kieSettings?.common ? kieSettings.common.kieServerPassword : '',
      },
      jbpm: {
        // serviceContext: '',
        containerId: kieSettings?.jbpm ? kieSettings.jbpm.containerId : '',
        processId: kieSettings?.jbpm ? kieSettings.jbpm.processId : '',
      },
      drools: {
        // serviceContext: '',
        containerId: kieSettings?.drools ? kieSettings.drools.containerId : '',
      },
      dmn: {
        // serviceContext: '',
        containerId: kieSettings?.dmn ? kieSettings.dmn.containerId : '',
        modelNamespace: kieSettings?.dmn ? kieSettings.dmn.modelNamespace : '',
        modelName: kieSettings?.dmn ? kieSettings.dmn.modelName : '',
      },
      fieldsValidation: {
        common: {
          kieServerBaseUrl:  {
            valid: () => !isEmpty(this.state.common.kieServerBaseUrl),
          },
          kieServerUser:  {
            valid: () => !isEmpty(this.state.common.kieServerUser),
          },
          kieServerPassword:  {
            valid: () => !isEmpty(this.state.common.kieServerPassword),
          },
        },      
        jbpm: {
          containerId: {
            valid: () => true, //!isEmpty(this.state.jbpm.containerId),
          },
          processId: {
            valid: () => true, //!isEmpty(this.state.jbpm.processId),
          },
        },
        drools: {
          containerId: {
            valid: () => !isEmpty(this.state.drools.containerId),
          },
        },
        dmn: {
          containerId: {
            valid: () => true, //!isEmpty(this.state.dmn.containerId),
          },
          modelNamespace: {
            valid: () => true, //!isEmpty(this.state.dmn.modelNamespace),
          },
          modelName: {
            valid: () => true, //!isEmpty(this.state.dmn.modelName),
          },
        }
      },
      _saveStatus: 'NONE',
      _rawServerResponse: {
      },
      _responseErrorAlertVisible: false,
      _responseModalOpen: false,
      _alert: {
        visible: false,
        variant: 'default',
        msg: '',
      },
    };

    // this.onTestConnection = this.onTestConnection.bind(this);
  }

  onSettingsSave = evt => {
    // evt.preventDefault();
    if (!this.formValidate()) return;

    const kieSettings = {
      common: this.state.common,
      jbpm: this.state.jbpm,
      drools: this.state.drools,
      dmn: this.state.dmn,
    };

    console.debug('saving kie settings into Brower\'s storage...', kieSettings);
    localStorage.setItem('kieSettings', JSON.stringify(kieSettings));
  };

  onTestConnection = evt => {
    // evt.preventDefault();
    if (!this.formValidate()) return;

    console.debug('testing kieserver connection');
    const kieSettings = {
      common: this.state.common,
      jbpm: this.state.jbpm,
      drools: this.state.drools,
      dmn: this.state.dmn,
    };

    this.kieClient = new KieClient(kieSettings);
    this.kieClient
    .testConnection()
      .then((response) => {
        this.setState({
          _alert: {
            visible: true,
            variant: 'success',
            msg: response?.type,
          },
        });
      })
      .catch((err) => {
        console.error(err);
          this.setState({
          _saveStatus: 'ERROR',
          _rawServerResponse: err.response,
          _alert: {
            visible: true,
            variant: 'danger',
            msg: err.status + ': ' +  err.response,
          },
        })
        
        this.scrollToTop();
      });
  };

  // common generic field Input Change Handler
  onInputChange = ({name, value}) => {
    const fieldObjectName = name.split('.')[0];
    const fieldPropertyName = name.split('.')[1];
    const objectState = Object.assign({}, this.state[fieldObjectName]);

    // console.debug('handleTextInputChange Handling: ' + name + ' value = ' + value);
    if ( Object.keys(objectState).find( (k, i, o) => k === fieldPropertyName) )
      objectState[fieldPropertyName] = value;

    this.setState( { [fieldObjectName]: objectState } );
  };

  // handler for Text fields
  handleTextInputChange = (value, event) => {
    const { id } = event.currentTarget;
    this.onInputChange({ name: id, value });
  };

  // handler for Radio fields
  handleRadioInputChange = (_, event) => {
    const { name } = event.currentTarget;
    const checkedValue = event.target.value;
    this.onInputChange({ name, value: checkedValue });
  };  

  // handler for Select fields
  handleSelectInputChange = (value, event) => {
    const { id } = event.currentTarget;
    this.onInputChange({ name: id, value });
  };

  // Form level validation
  formValidate = () => {
    const fieldsValidation = this.state.fieldsValidation;
    let invalidFields = null;
    let valid = true;
    Object.getOwnPropertyNames(fieldsValidation).forEach(p => {
      // console.debug('formValidate() \n\t traverssing obj property [' + p + '] is obj type: ' + (fieldsValidation[p] instanceof Object));
      invalidFields = Object.keys(fieldsValidation[p]).filter(k => !fieldsValidation[p][k].valid());

      if (invalidFields.length > 0) { 
        // console.debug('formValidate() \n\t obj [' + p + '] contains ' + invalidFields.length + ' invalid field(s)');
        valid = false;
        return;
      }
    });
    return valid;
  };

  componentDidUpdate(prevProps, prevState, snapshot) {
    console.debug('SettingsForm ->>> componentDidUpdate...');
  }

  componentDidMount() {
    console.debug('SettingsForm ->>> componentDidMount...');
  }

  componentWillUnmount() {
    console.debug('SettingsForm ->>> componentWillMount...');
  }

  closeResponseAlert = () => {
    this.setState({
      _alert: {
        visible: false,
        variant: 'default',
        msg: '',
      },
    });
  }
  
  handleModalToggle = () => {
    this.setState(({ _responseModalOpen }) => ({
      _responseModalOpen: !_responseModalOpen
    }));
  };

  scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  render() {
    return (
      <Form isHorizontal>
        <React.Fragment>
          {/**/
          this.state._alert.visible && (
            <Alert
              variant={this.state._alert.variant}
              autoFocus={true}
              title={this.state._alert.msg}
              action={<AlertActionCloseButton onClose={this.closeResponseAlert} />}
            />
          )
          /**/}

        </React.Fragment>
        {/** Common fields */}
        {/**  **/}
        <FormSection>
          <FormGroup
            label="Kie Server Base URL"
            isRequired
            fieldId="common.kieServerBaseUrl"
            helperText="Enter the URL for the Kie Server"
            helperTextInvalid="URL must not be empty">
            <TextInput
              isRequired
              type="url"
              id="common.kieServerBaseUrl"
              validated={this.state.fieldsValidation.common['kieServerBaseUrl'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
              value={this.state.common.kieServerBaseUrl}
              onChange={ this.handleTextInputChange } />
          </FormGroup>
          <FormGroup
            label="Kie Server Username"
            isRequired
            fieldId="common.kieServerUser"
            helperText="Enter the Usernme for the Kie Server"
            helperTextInvalid="User must not be empty">
            <TextInput
              isRequired
              type="text"
              id="common.kieServerUser"
              validated={this.state.fieldsValidation.common['kieServerUser'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
              value={this.state.common.kieServerUser}
              onChange={ this.handleTextInputChange } />
          </FormGroup>
          <FormGroup
            label="Kie Server Password"
            isRequired
            fieldId="common.kieServerPassword"
            helperText="Enter the Password for the Kie Server"
            helperTextInvalid="Password must not be empty">
            <TextInput
              isRequired
              type="password"
              id="common.kieServerPassword"
              validated={this.state.fieldsValidation.common['kieServerPassword'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
              value={this.state.common.kieServerPassword}
              onChange={ this.handleTextInputChange } />
          </FormGroup>
        </FormSection>
        <FormSection>
        <FormGroup
            label="Decision Kie Continer Id"
            isRequired
            fieldId="drools.containerId"
            helperText="Enter the Container Id"
            helperTextInvalid="ContainerId must not be empty">
            <TextInput
              isRequired
              type="text"
              id="drools.containerId"
              validated={this.state.fieldsValidation.drools['containerId'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
              value={this.state.drools.containerId}
              onChange={ this.handleTextInputChange } />
          </FormGroup>          
        </FormSection>

        <ActionGroup>
          <Button variant="primary" onClick={this.onSettingsSave} isDisabled={!this.formValidate()}>Save</Button>
          <Button variant="secondary" type="reset">Reset</Button>
          <Button variant="secondary" onClick={this.onTestConnection} isDisabled={!this.formValidate()}>Test Connection</Button>
        </ActionGroup>
      </Form>
    );
  }
}

export default SettingsForm;