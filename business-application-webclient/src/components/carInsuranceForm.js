import "@patternfly/react-core/dist/styles/base.css";
import isEmpty from 'validator/lib/isEmpty';

import KieClient from './kieClient';
import formValidator from './formValidation';
import { loadFromLocalStorage } from './util'
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
  ExpandableSection,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { BorderNoneIcon } from "@patternfly/react-icons";
import ReactJson from 'react-json-view'

// const RULES_KIE_CONTAINER_NAME='kie-rules-templates-1.0.0-SNAPSHOT';
const RULES_KIE_SESSION_NAME='stateless-session';
const DRIVER_FACT_FQDN='com.redhat.demos.decisiontable.Driver';
const POLICY_FACT_FQDN='com.redhat.demos.decisiontable.Policy';

class CarInsuranceForm extends React.Component {
  constructor(props) {
    super(props);

    const kieSettings = loadFromLocalStorage('kieSettings', true);
    this.kieClient = new KieClient(kieSettings);

    this.state = {
      driver: {
        name: '',
        age: 0,
        priorClaims: 0,
        locationRiskProfile: 'NONE',
      },
      policy: {
        type: 'NONE',
        approved: false,
        discountPercent: 0,
        basePrice: 0.0,
      },
      fieldsValidation: {
        driver: {
          name: {
            valid: () => !isEmpty(this.state.driver.name),
            validationMarker: ValidatedOptions.default,
          },
          age: {
            valid: () => this.state.driver.age > 0,
            validationMarker: ValidatedOptions.default,
          },
          priorClaims: {
            valid: () => this.state.driver.priorClaims >= 0 && this.state.driver.priorClaims <= 100,
            validationMarker: ValidatedOptions.default,
          },
          locationRiskProfile: {
            valid: () => this.state.driver.locationRiskProfile !== 'NONE',
            validationMarker: ValidatedOptions.default,
          },
        },
        policy: {
          type: {
            valid: () => this.state.policy.type !== 'NONE',
            validationMarker: ValidatedOptions.default,
          }
        }
      },
      _saveStatus: 'NONE',
      _rawServerRequest: {},
      _rawServerResponse: {},
      _serverResponse: {
        driverFact: { },
        policyFact: { },
      },
      _responseErrorAlertVisible: false,
      _responseModalOpen: false,
      _alert: {
        visible: false,
        variant: 'default',
        msg: '',
      },
      _isDebugExpanded: false,
    };
  }

  onFormSubmit = evt => {
    evt.preventDefault();

    this.setState({
      _saveStatus: 'Processing...',
      _canValidate: true,
    });

    if (!this.formValidate()) return;

    const driverFact = this.kieClient.newInsertCommand({ [DRIVER_FACT_FQDN]: this.state.driver }, 'driver', true);
    const policyFact = this.kieClient.newInsertCommand({ [POLICY_FACT_FQDN]: this.state.policy }, 'policy', true);
    const facts = [driverFact, policyFact];
    // build server request payload just for debug purposes
    const rawServerRequest = this.kieClient.buildDroolsRequestBody(facts, RULES_KIE_SESSION_NAME);

    this.kieClient
      .fireRules(facts)
      .then((response) => {

        const driverFact = this.kieClient.extractFactFromKieResponse(response, 'driver');
        const policyFact = this.kieClient.extractFactFromKieResponse(response, 'policy');

        this.setState({
          _saveStatus: 'NONE',
          _rawServerResponse: response,
          _serverResponse: {
            driverFact,
            policyFact,
          },
          _responseModalOpen: true,
        });

        // scroll the page to make alert visible
        this.scrollToTop();
      })
      .catch(err => {
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
      })
      .finally(() => {
        this.setState({
          _rawServerRequest: rawServerRequest,
        })
      });

  };

  // common generic field Input Change Handler
  // onInputChange = ({name, value}) => {
  //   const driver = Object.assign({}, this.state.driver);
  //   const policy = Object.assign({}, this.state.policy);
  //   //console.log('handleTextInputChange Handling: ' + name + ' value = ' + value);

  //   if ( Object.keys(driver).find( (k, i, o) => k === name) )
  //     driver[name] = value;
    
  //   if ( Object.keys(policy).find( (k, i, o) => k === name) )
  //     policy[name] = value;

  //   this.setState( {driver, policy} );
  //   console.debug(this.state.driver);
  // };

  onInputChange = ({name, value}) => {
    const fieldObjectName = name.split('.')[0];
    const fieldPropertyName = name.split('.')[1];
    const objectState = Object.assign({}, this.state[fieldObjectName]);
    const fieldsValidation = Object.assign({}, this.state.fieldsValidation);

    // console.debug('handleTextInputChange Handling: ' + name + ' value = ' + value);
    if (Object.keys(objectState).find( (k, i, o) => k === fieldPropertyName )) {
      objectState[fieldPropertyName] = value;

      //field level validation
      //Doesn't work as at this point the state is not updated yet
      // if (!fieldsValidation[fieldObjectName][fieldPropertyName].valid()) {
      //   fieldsValidation[fieldObjectName][fieldPropertyName].validationMarker = ValidatedOptions.error;
      // }
      // else {
      //   fieldsValidation[fieldObjectName][fieldPropertyName].validationMarker = ValidatedOptions.default;
      // }
    }

    this.setState({ 
      [fieldObjectName]: objectState,
      fieldsValidation
    });
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

  // // Form level validation
  // formValidate = () => {
  //   const fieldsValidation = this.state.fieldsValidation;
  //   const invalidFields = Object.keys(fieldsValidation.driver).filter(k => !fieldsValidation.driver[k].valid()).concat(
  //     Object.keys(fieldsValidation.policy).filter(k => !fieldsValidation.policy[k].valid())
  //   );
  //   const _formValid = invalidFields.length == 0;
  //   console.debug('formValid? ' + _formValid);
  //   return _formValid;
  // };

  // Form level validation
  formValidate = () => {
    const fieldsValidation = this.state.fieldsValidation;
    let invalidFields = null;
    let valid = true;

    // for each Object in the Form's fieldsValidation 
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
    console.debug('CarInsuranceForm ->>> componentDidUpdate...');
  }

  componentDidMount() {
    console.debug('CarInsuranceForm ->>> componentDidMount...');
  }

  componentWillUnmount() {
    console.debug('CarInsuranceForm ->>> componentWillMount...');
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

  onDebugViewToggle = (isExpanded) => {
    this.setState({
      _isDebugExpanded: isExpanded
    });
  };  

  scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  render() {
    const isExpanded = this.state._isDebugExpanded;
    const insuranceTypes = [
      { value: 'NONE', label: 'Select an Insurance Type', disabled: false },
      { value: 'COMPREHENSIVE', label: 'Comprehensive', disabled: false },
      { value: 'FIRE_THEFT', label: 'Fire and Theft', disabled: false },
      { value: 'THIRD_PARTY', label: '3rd Party', disabled: false },
    ];
    const pricingBracket = [
      { value: 'NONE', label: 'Select Pricing Bracket', disabled: false },
      { value: 'LOW', label: 'Low', disabled: false },
      { value: 'MED', label: 'Medium', disabled: false },
      { value: 'HIGH', label: 'High', disabled: false },
    ];
    const locationRisk = [
      { value: 'NONE', label: 'Select Location Risk', disabled: false },
      { value: 'LOW', label: 'Low', disabled: false },
      { value: 'MED', label: 'Medium', disabled: false },
      { value: 'HIGH', label: 'High', disabled: false },
    ];

    const dateRegex = /(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])/;

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

          <Modal
            variant="small"
            title="Application submitted!"
            isOpen={this.state._responseModalOpen}
            onClose={this.handleModalToggle}
            actions={[
              <Button key="confirm" variant="primary" onClick={this.handleModalToggle}>
                Confirm
              </Button>,
              <Button key="cancel" variant="link" onClick={this.handleModalToggle}>
                Cancel
              </Button>
            ]}
          >
            <TextContent>
              <TextList component={TextListVariants.dl}>
                <TextListItem component={TextListItemVariants.dt}>Name</TextListItem>
                <TextListItem component={TextListItemVariants.dd}>{this.state._serverResponse.driverFact.name}</TextListItem>
                <TextListItem component={TextListItemVariants.dt}>Age</TextListItem>
                <TextListItem component={TextListItemVariants.dd}>{this.state._serverResponse.driverFact.age}</TextListItem>
                <TextListItem component={TextListItemVariants.dt}>Prior Claims</TextListItem>
                <TextListItem component={TextListItemVariants.dd}>{this.state._serverResponse.driverFact.priorClaims}</TextListItem>
                <TextListItem component={TextListItemVariants.dt}>Location Risk Profile</TextListItem>
                <TextListItem component={TextListItemVariants.dd}>{this.state._serverResponse.driverFact.locationRiskProfile}</TextListItem>
              </TextList>
              <TextList component={TextListVariants.dl}>
                <TextListItem component={TextListItemVariants.dt}>Policy Type</TextListItem>
                <TextListItem component={TextListItemVariants.dd}>{this.state._serverResponse.policyFact.type}</TextListItem>
                <TextListItem component={TextListItemVariants.dt}>Approved?</TextListItem>
                <TextListItem component={TextListItemVariants.dd}>{this.state._serverResponse.policyFact.approved ? 'yes' : 'no'}</TextListItem>
                <TextListItem component={TextListItemVariants.dt}>Discount</TextListItem>
                <TextListItem component={TextListItemVariants.dd}>{this.state._serverResponse.policyFact.discountPercent}</TextListItem>
                <TextListItem component={TextListItemVariants.dt}>Base Price</TextListItem>
                <TextListItem component={TextListItemVariants.dd}>{this.state._serverResponse.policyFact.basePrice}</TextListItem>
              </TextList>
            </TextContent>

        </Modal>        
        </React.Fragment>
        {/** Driver fields */}
        {/**  **/}
        <FormGroup
          label="Driver Name"
          isRequired
          fieldId="driver.name"
          helperText="Enter your Name"
          helperTextInvalid="Name must not be empty">
          <TextInput
            isRequired
            type="text"
            id="driver.name"
            validated={this.state.fieldsValidation.driver['name'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
            value={this.state.driver.name}
            onChange={ this.handleTextInputChange } />
        </FormGroup>        
        <FormGroup 
          label="Age" 
          isRequired 
          fieldId="driver.age"
          helperText="Enter your Age "
          helperTextInvalid="Age must be a valid number '1-120'">
          <TextInput
            isRequired
            type="number"
            id="driver.age"
            placeholder="0-120"
            validated={this.state.fieldsValidation.driver['age'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
            value={this.state.driver.age}
            onChange={ this.handleTextInputChange }
          />
        </FormGroup>
        <FormGroup 
          label="Prior Claims" 
          isRequired 
          fieldId="driver.priorClaims"
          helperText="Enter # of prior claims "
          helperTextInvalid="must be a valid number '1-100'">
          <TextInput
            isRequired
            type="number"
            id="driver.priorClaims"
            placeholder="0-100"
            validated={this.state.fieldsValidation.driver['priorClaims'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
            value={this.state.driver.priorClaims}
            onChange={ this.handleTextInputChange }
          />
        </FormGroup>
        <FormGroup
          label="Location Risk Profile"
          isRequired
          fieldId="driver.locationRiskProfile">
          <FormSelect
            id="driver.locationRiskProfile" 
            value={this.state.driver.locationRiskProfile} 
            onChange={this.handleSelectInputChange}
            validated={this.state.fieldsValidation.driver['locationRiskProfile'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
            >
            {
            locationRisk.map((option, index) => (
                <FormSelectOption 
                  isDisabled={option.disabled} 
                  key={index} 
                  value={option.value} 
                  label={option.label} 
                />
              ))
            }
          </FormSelect>
        </FormGroup>

        <Divider />

        {/** Policy fields */}
        <FormSection>
          <FormGroup
            label="Policy Type"
            isRequired
            fieldId="policy.type">
            <FormSelect
              id="policy.type" 
              value={this.state.policy.type} 
              onChange={this.handleSelectInputChange}
              validated={this.state.fieldsValidation.policy['type'].valid() ? ValidatedOptions.default : ValidatedOptions.error}
              >
              {
              insuranceTypes.map((option, index) => (
                  <FormSelectOption 
                    isDisabled={option.disabled} 
                    key={index} 
                    value={option.value} 
                    label={option.label} 
                  />
                ))
              }
            </FormSelect>
          </FormGroup>
        </FormSection>

        <ActionGroup>
          <Button variant="primary" type="submit" onClick={this.onFormSubmit} isDisabled={!this.formValidate()}>Submit</Button>
          <Button variant="secondary" type="reset">Cancel</Button>
        </ActionGroup>

        {/* <Expandable toggleText={isExpanded ? 'Show Less' : 'Show More'} onToggle={this.onDebugViewToggle} isExpanded={isExpanded}>
          This content is visible only when the component is expanded.
        </Expandable>     */}
        <ExpandableSection toggleText="Debug View">
          <Grid hasGutter>
            <GridItem span={6}>
              <ReactJson name={false} src={this.state._rawServerRequest} />
            </GridItem>
            <GridItem span={4}>
              <ReactJson name={false} src={this.state._rawServerResponse.result} />
            </GridItem>
          </Grid>
        </ExpandableSection>    
      </Form>      
    );
  }
}

export default CarInsuranceForm;