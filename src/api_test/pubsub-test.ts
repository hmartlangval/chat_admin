import { AidoOrderProcessing, AidoOrderRecord } from '../data/models/AidoOrderProcessing';
import { PubSub } from '../data/models/PubSub';

const BASE_URL = 'http://localhost:3000/api';

async function testPubSubAPI() {
  try {
    console.log('Starting PubSub API test...');
    
    // First, create some test data in the aido_order_processing collection
    console.log('\nSetting up test data...');
    const aidoOrder = new AidoOrderProcessing();
    const pubsub = new PubSub();
    
    // Create a test record in aido_order_processing
    const testRecordId = `test-${Date.now()}`;
    const testRecord: Partial<AidoOrderRecord> = {
      id: testRecordId,
      url: '/test/url',
      original_filename: 'test.pdf',
      file_type: 'application/pdf',
      folder_path: 'test',
      property_status: 'pending',
      tax_status: 'pending',
      extracted_data: { test: 'data' }
    };
    
    const aidoRecords = await aidoOrder.create(testRecord);
    console.log('Created aido order record:', aidoRecords[0]._id);
    
    // Create corresponding PubSub record
    const pubsubRecord = await pubsub.create({
      id: testRecordId,
      prop: 1,
      tax: 1,
      data: { testData: 'Sample test data' }
    });
    
    console.log('Created pubsub record:', pubsubRecord._id);
    
    // Test GET /api/pubsub/prop
    console.log('\nTesting GET /pubsub/prop...');
    const propResponse = await fetch(`${BASE_URL}/pubsub?type=prop`);
    if (!propResponse.ok) {
      throw new Error(`GET prop failed: ${propResponse.statusText}`);
    }
    const propResult = await propResponse.json();
    console.log('Active prop records:', propResult.records.length);
    
    // Test GET /api/pubsub/tax
    console.log('\nTesting GET /pubsub?type=tax...');
    const taxResponse = await fetch(`${BASE_URL}/pubsub?type=tax`);
    if (!taxResponse.ok) {
      throw new Error(`GET tax failed: ${taxResponse.statusText}`);
    }
    const taxResult = await taxResponse.json();
    console.log('Active tax records:', taxResult.records.length);
    
    // Test PUT to complete prop task
    console.log('\nTesting PUT /pubsub/prop/:id...');
    const propCompleteResponse = await fetch(`${BASE_URL}/pubsub/prop/${testRecordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!propCompleteResponse.ok) {
      throw new Error(`PUT prop complete failed: ${propCompleteResponse.statusText}`);
    }
    
    const propCompleteResult = await propCompleteResponse.json();
    console.log('Prop complete result:', propCompleteResult.message);
    
    // Verify aido order record has been updated
    const updatedAidoRecords = await aidoOrder.find({ id: testRecordId });
    console.log('Updated aido record property_status:', 
      updatedAidoRecords?.[0]?.property_status || 'not found');
    
    // Test PUT to complete tax task (should remove the record from pubsub)
    console.log('\nTesting PUT /pubsub/tax/:id...');
    const taxCompleteResponse = await fetch(`${BASE_URL}/pubsub/tax/${testRecordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!taxCompleteResponse.ok) {
      throw new Error(`PUT tax complete failed: ${taxCompleteResponse.statusText}`);
    }
    
    const taxCompleteResult = await taxCompleteResponse.json();
    console.log('Tax complete result:', taxCompleteResult.message);
    
    // Verify the record has been removed from pubsub
    const remainingPubsub = await pubsub.findById(testRecordId);
    console.log('PubSub record after both completions:', 
      remainingPubsub ? 'Still exists' : 'Removed as expected');
    
    // Verify aido order record has been fully updated
    const finalAidoRecords = await aidoOrder.find({ id: testRecordId });
    if (finalAidoRecords && finalAidoRecords.length > 0) {
      console.log('Final aido record status:', {
        property: finalAidoRecords[0].property_status,
        tax: finalAidoRecords[0].tax_status
      });
      
      // Clean up test data
      await aidoOrder.delete(finalAidoRecords[0]._id.toString());
    }
    
    console.log('\nPubSub API test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPubSubAPI();
}

export { testPubSubAPI }; 