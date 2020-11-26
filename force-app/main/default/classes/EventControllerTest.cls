@isTest(SeeAllData=true)
public with sharing class EventControllerTest {
    @isTest static void selectEventRecordTest() {
        Event event = EventController.selectEventRecord('00U2w000008nn7pEAA', 'LWCFieldSet');
        System.assertNotEquals(null, event);
    }
}
