import { LightningElement, wire, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getFieldSetMetadata from '@salesforce/apex/FieldSetController.getFieldSetMetadata';
import selectEventRecord from '@salesforce/apex/EventController.selectEventRecord';
import upsertEventRecord from '@salesforce/apex/EventController.upsertEventRecord';
import { NavigationMixin } from 'lightning/navigation';
import { getInputFieldAttributes, getRecordFieldValue, getInputValue } from './eventFormHelper';

export default class Fieldset extends NavigationMixin(LightningElement) {

    // Config
    showTitle = true;
    strTitle= 'Event';
    iconName;
    iconNewEventName = 'action:new_event';
    iconEditEventName = 'action:log_event';
    columnsLarge = true;
    columnsMedium = true;
    columnsSmall = true;
    fieldSetName = 'LWCFieldSet';
    isEditable = true;
    alwaysEditing = true;
    saveMessageTitle = true;
    saveMessage = true;
    @api recordId;
    @track objectTypeName = 'Event';

    // Record props
    @track sObjectName;
    @track recordFields = [];
    @track metadataError;
    @track eventRecord;
    data;

    // Track changes to our main properties that will need to be binded to HTML
    @track isLoading = true;
    @track isEditing = false;
    @track hasChanged = false;
    @track isSaving = false;
    @track layoutSizeLarge;
    @track layoutSizeMedium;
    @track layoutSizeSmall;

    // Web Component Init
    connectedCallback() {
        // Setup the layout sizes
        console.log(this.recordId);
        if (this.columnsLarge) this.layoutSizeLarge = 12 / this.columnsLarge;
        if (this.columnsMedium) this.layoutSizeMedium = 12 / this.columnsMedium;
        if (this.columnsSmall) this.layoutSizeSmall = 12 / this.columnsSmall;
        // Handle always editing state
        if (this.alwaysEditing) this.isEditing = true;
        
    }

   

    // Get the SObjectType and the Fields
    @wire(getFieldSetMetadata, {
        objectTypeName: '$objectTypeName',
        fieldSetName: '$fieldSetName'
    })
    wiredFieldSetMetadata(result) {
        this.data = result;
        console.log('getting META!');
        this.isLoading = true;
        let data = result.data;
        let error = result.error;
        if (data) {
            console.log("Data!");
            selectEventRecord({
                recordId: this.recordId,
                fieldsetName: this.fieldSetName
            }).then(result => {
                    console.log('Good event record received! ');
                    console.log(result);
                    this.eventRecord = result;
                    this.formRecordFields(data);
                    this.isLoading = false;
                })
                .catch(error => {
                    this.error = error;
                    console.log('Record retrieve error! ');
                    console.log(error);
                    this.formRecordFields(data);
                    this.isLoading = false;
                });
            
        } else if (error) {
            console.log("Error!");
            this.metadataError = 'Unknown error';
            if (Array.isArray(error.body)) {
                this.metadataError = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                this.metadataError = error.body.message;
            }
            console.error('getMetadata error', this.metadataError);
        }
        if (this.recordFields.length || this.metadataError) this.isLoading = false;
    }

    formRecordFields(data) {
        // Get the FieldSet Name if we have no custom title
        if (this.recordId) {
            this.strTitle = 'Edit ' + this.strTitle;
            this.iconName = this.iconEditEventName;
        } else {
            this.strTitle = 'Create  ' + this.strTitle;
            this.iconName = this.iconNewEventName;;
        }
        
        // Get the Record Type Id
        this.recordTypeId = data.recordTypeId;
        // Get the SObject Name
        this.sObjectName = data.sObjectName;
        let newRecordFields = [];
        data.fieldsMetadata.forEach((fd) => {
            // Get valid JSON
            
            const fieldProperties = JSON.parse(fd);
            console.log(fieldProperties);
            const {
                fieldSetProperties,
                fieldDescribeProperties
            } = fieldProperties;
            let field = getInputFieldAttributes(fieldDescribeProperties);
            console.log('event record '+this.eventRecord);
            if(this.eventRecord) {
                field.value = getRecordFieldValue(this.eventRecord, field.name);
                console.log('Field value');
                console.log(field.value);
            }
            
            //this.recordFields.push(field);
            newRecordFields.push(field);
            console.log(this.recordFields);
        });
        // Clear any errors
        this.metadataError = undefined;
        this.recordFields = newRecordFields;
    }

    navigateToCalendar() {
        // Use the built-in 'Navigate' method
        this[NavigationMixin.Navigate]({
            // Pass in pageReference
            type: 'standard__namedPage',
            attributes: {
                pageName: 'calendar'
            }
        });
    }

    // Get the card Title if we should show it
    get cardTitle() {
        return this.showTitle ? this.strTitle : null;
    }

    // Show spinner error property
    get showSpinner() {
        return this.isLoading || this.isSaving;
    }

    // Show the record form
    get showForm() {
        return !this.isLoading && !!this.sObjectName && !this.metadataError;
    }

    // Check if we can edit
    get editLabel() {
        return this.isEditing ? 'Cancel' : 'Edit';
    }

    // Check if we can edit
    get canEdit() {
        return this.isEditable && !this.alwaysEditing && !!this.recordFields.length;
    }

    // Check if we can save, we need fields
    get canSave() {
        return (this.canEdit || this.alwaysEditing) && this.isEditing && this.hasChanged && !!this.recordFields.length;
    }

    // Show a UI Message
    showToastEvent(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }

    handleSave() {
        console.log('SAVE!!!');
        let inputs = this.template.querySelectorAll("lightning-input");
        let comboboxes = this.template.querySelectorAll("lightning-combobox");
        console.log('Inputs');
        console.log(inputs);
        let eventFromForm = {};
        this.recordFields.forEach(field => eventFromForm[field.name] = getInputValue(inputs, comboboxes, field));
        console.log('constr object');
        console.log(eventFromForm);
        if(this.recordId) {
            eventFromForm.Id = this.recordId;
        }
        
        upsertEventRecord({
            eventJSON: JSON.stringify(eventFromForm)
        }).then(result => {
                console.log('save result! ');
                console.log(result);
                this.showToast(this.recordId ? 'Event successfully edited!' : 'Event successfully created!');
            })
            .catch(error => {
                this.error = error;
                console.log('Record save error! ');
                console.log(error);
            });
    }

    showToast(message) {
        const event = new ShowToastEvent({
            title: 'Success',
            message: message,
            variant: 'success'
        });
        this.dispatchEvent(event);
    }

    // Handle the form Error callback
    handleFormError() {
        // Hide spinner
        this.isSaving = false;
    };
}