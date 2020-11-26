public with sharing class FieldSetController {

    public static DescribeSObjectResult sObjectResult;

    @AuraEnabled(Cacheable=true)
    public static MetadataResponse getObjectMetadata(String objectTypeName) {
        // Setup response object
        MetadataResponse response = new MetadataResponse();
        try {
            // Handle Errors
            System.debug('### getMetadata objectTypeName >>> '+objectTypeName);
            if (String.isBlank(objectTypeName)) newException('objectTypeName is required to get fieldset', null);
            // Get the SObject
            sObjectResult = Schema.getGlobalDescribe().get(objectTypeName).getDescribe();
            System.debug('### getMetadata sObjectResult >>> '+sObjectResult);
            response.sObjectName = sObjectResult.getName();
        } catch (Exception ex) {
            newException(ex.getMessage(), ex.getStackTraceString());
        }
        // Return metadata
        return response;
    }

    @AuraEnabled(Cacheable=true)
    public static MetadataResponse getFieldSetMetadata(String objectTypeName, String fieldSetName) {
        // Setup response object
        MetadataResponse response = new MetadataResponse();
        try {
            // Get the SObject
            response = getObjectMetadata(objectTypeName);
            System.debug('### getMetadata sObjectResult >>> '+sObjectResult);
            response.sObjectName = sObjectResult.getName();
            // Handle Errors
            System.debug('### getMetadata fieldSetName >>> '+fieldSetName);
            if (String.isBlank(fieldsetName)) newException('Fieldset Name required to get Field Metadata', null);
            // Get the FieldSets
            Map<String, FieldSet> fieldSets = sObjectResult.fieldSets.getMap();
            // Check if we have a fieldset with that name
            if (fieldSets.containsKey(fieldSetName)) {
                // Get the Object fields
                Map<String, SObjectField> fields = sObjectResult.fields.getMap();
                // Check if the object has a record type id field 
                if (fields.containsKey('RecordTypeId')) {
                    // Get the records record type Id
                    //response.recordTypeId = (String) ((SObject) Database.query('SELECT RecordTypeId FROM '+response.sObjectName)).get('RecordTypeId');
                }
                // Get the Label
                response.fieldSetLabel = fieldSets.get(fieldSetName).getLabel();
                System.debug('### getMetadata response.fieldSetLabel >>> '+response.fieldSetLabel);
                // Construct a new list
                response.fieldsMetadata = new List<String>();
                // For each field in the FieldSet
                for (FieldSetMember fieldSetMember : fieldSets.get(fieldSetName).getFields()) {
                    // Get the path
                    String fieldName = fieldSetMember.getFieldPath();
                    System.debug('### getMetadata fieldName >>> '+fieldName);
                    // We can't handle Relationship fields
                    if (!fieldName.contains('.')) {
                        // Get the field describe
                        DescribeFieldResult fd = fields.get(fieldName).getDescribe();
                        // If the current user has access to the field
                        System.debug('### getMetadata fd.isAccessible() >>> '+fd.isAccessible());
                        if (fd.isAccessible()) {
                            response.fieldsMetadata.add(JSON.serialize(
                                new Map<String, Object>{
                                    'fieldSetProperties' => fieldSetMember,
                                    'fieldDescribeProperties' => fd
                                }
                            ));
                        }
                    } else {
                        newException('Relationship Fields not supported FieldSet: "'+fieldSetName+'" Field Name: "'+fieldName+'"', null);
                    }
                }
                // Make sure we have fields
                System.debug('### getMetadata response.fieldsMetadata >>> '+response.fieldsMetadata);
                if (response.fieldsMetadata.isEmpty()) newException('No accessible fields for the current user in FieldSet "'+fieldSetName+'"', null);
            } else {
                newException('Fieldset "'+fieldSetName+'" not found for SObject "'+sObjectResult.getName()+'"', null);
            }
        } catch (Exception ex) {
            newException(ex.getMessage(), ex.getStackTraceString());
        }
        // Return metadata
        return response;
    }

    private static void newException(String exceptionMessage, String stackTraceString) {
        System.debug('### newException exceptionMessage >>> '+exceptionMessage);
        System.debug('### newException stackTraceString >>> '+stackTraceString);
        AuraHandledException ex = new AuraHandledException(exceptionMessage);
        ex.setMessage(exceptionMessage + (String.isNotBlank(stackTraceString) ? ' ' + stackTraceString : ''));
        throw ex;
    }

    public class MetadataResponse {

        @AuraEnabled
        public String recordTypeId;

        @AuraEnabled
        public String fieldSetLabel;

        @AuraEnabled
        public String sObjectName;

        @AuraEnabled
        public List<String> fieldsMetadata;

    }
}
