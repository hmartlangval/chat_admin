import React, { useState, useEffect } from 'react';
import { Button } from './UI/button';
import { useWebSocket } from '../contexts/WebSocketContext';
import axios from 'axios';

interface StartTaskButtonProps {
  className?: string;
  buttonText?: string;
  isChannelActive?: boolean;
}

interface FormData {
  orderNumber: string;
  parcelAccount?: string;
  fullAddress: string;
  county: string;
}

interface ParsedData {
  orderNumber: string;
  parcelAccount: string;
  propertyAddress: string;
  houseNumber: string;
  streetName: string;
  city: string;
  zipCode: string;
  county: string;
  state: string;
}

// Sample county data - to be replaced with actual data
const COUNTIES = {
  "alachua": "Alachua",
  "baker": "Baker",
  "bay": "Bay",
  "bradford": "Bradford",
  "brevard": "Brevard",
  "broward": "Broward",
  "calhoun": "Calhoun",
  "charlotte": "Charlotte",
  "citrus": "Citrus",
  "clay": "Clay",
  "collier": "Collier",
  "columbia": "Columbia",
  "desoto": "DeSoto",
  "dixie": "Dixie",
  "duval": "Duval",
  "escambia": "Escambia",
  "flagler": "Flagler",
  "franklin": "Franklin",
  "gadsden": "Gadsden",
  "gilchrist": "Gilchrist",
  "glades": "Glades",
  "gulf": "Gulf",
  "hamilton": "Hamilton",
  "hardee": "Hardee",
  "hendry": "Hendry",
  "hernando": "Hernando",
  "highlands": "Highlands",
  "hillsborough": "Hillsborough",
  "holmes": "Holmes",
  "indian_river": "Indian River",
  "jackson": "Jackson",
  "jefferson": "Jefferson",
  "lafayette": "Lafayette",
  "lake": "Lake",
  "lee": "Lee",
  "leon": "Leon",
  "levy": "Levy",
  "liberty": "Liberty",
  "madison": "Madison",
  "manatee": "Manatee",
  "marion": "Marion",
  "martin": "Martin",
  "miami-dade": "Miami-Dade",
  "monroe": "Monroe",
  "nassau": "Nassau",
  "okaloosa": "Okaloosa",
  "okeechobee": "Okeechobee",
  "orange": "Orange",
  "osceola": "Osceola",
  "palm_beach": "Palm Beach",
  "pasco": "Pasco",
  "pinellas": "Pinellas",
  "polk": "Polk",
  "putnam": "Putnam",
  "santa_rosa": "Santa Rosa",
  "sarasota": "Sarasota",
  "seminole": "Seminole",
  "st_johns": "St Johns",
  "st_lucie": "St Lucie",
  "sumter": "Sumter",
  "suwannee": "Suwannee",
  "taylor": "Taylor",
  "union": "Union",
  "volusia": "Volusia",
  "wakulla": "Wakulla",
  "walton": "Walton",
  "washington": "Washington"
}


export function StartTaskButtonForm({
  className = '',
  buttonText = 'Start New Task',
  isChannelActive = false
}: StartTaskButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    orderNumber: 'Volusia-3930293',
    parcelAccount: '803445000280',
    fullAddress: '340 COLOMBA RD',
    county: 'Volusia'
  });

  const [parsedData, setParsedData] = useState<ParsedData>({
    orderNumber: '',
    parcelAccount: '',
    propertyAddress: '',
    houseNumber: '',
    streetName: '',
    city: '',
    zipCode: '',
    county: '',
    state: 'FL'
  });

  const { sendMessage } = useWebSocket();

  // Add ESC key handler to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    // Add event listener when modal is open
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    // Clean up event listener when component unmounts or modal closes
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleParsedInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setParsedData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAnalyze = async () => {
    setIsProcessing(true);
    try {
      const response = await axios.post('/api/v2/aido-order/analyze', formData);

      // Extract data from the response to populate the parsed fields
      const results = response.data.results || {};
      const sData = results.s_data || {};

      setParsedData({
        orderNumber: results.order_number || formData.orderNumber,
        parcelAccount: sData.x_account_number || formData.parcelAccount || '',
        propertyAddress: sData.x_property_address || formData.fullAddress,
        houseNumber: sData.x_house_number || '',
        streetName: sData.x_street_name || '',
        city: sData.x_city || '',
        zipCode: sData.x_zip_code || '',
        county: sData.x_county || formData.county,
        state: 'FL'
      });
    } catch (error) {
      console.error('Error analyzing property:', error);
      alert('Error analyzing property. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      // Create payload from the parsed data
      const payload = {
        data_source: "form",
        extracted_data: {
          order_number: parsedData.orderNumber,
          s_data: {
            x_account_number: parsedData.parcelAccount,
            x_parcel_id: parsedData.parcelAccount,
            x_property_address: parsedData.propertyAddress,
            x_house_number: parsedData.houseNumber,
            x_street_name: parsedData.streetName,
            x_city: parsedData.city,
            x_zip_code: parsedData.zipCode,
            x_county: parsedData.county,
            x_state: parsedData.state
          },
          context: {
            pdf_path: "",
            original_file_name: "none",
          }
        }
      };

      const response = await axios.post('/api/dynamic/aido_order_processing', payload);
      console.log(response)

      if (response.status !== 201) {
        alert('Error submitting property. Please try again.')
        return
      }

      const data = (response.data.records ?? []).map((record: any) => ({
        ...record.extracted_data,
        order_number: record.extracted_data.order_number,
        id: record._id,
      }))[0]

      // Send the message using WebSocket
      const msgBody: any = {
        action: "start_task",
        ...data
      }

      await axios.post('/api/channels/general/sendMessage', {
        channelId: "general",
        content: `@fileprep start new task [json]${JSON.stringify(msgBody)}[/json] [Retry]`,
        senderId: "system",
        senderName: "System",
      });

      // if (process.env.DEVELOPMENT_MODE !== 'true') {
      // clear the form data
      setFormData({
        orderNumber: '',
        parcelAccount: '',
        fullAddress: '',
        county: Object.keys(COUNTIES)[0]
      });

      //clear the parsed data
      setParsedData({
        orderNumber: '',
        parcelAccount: '',
        propertyAddress: '',
        houseNumber: '',
        streetName: '',
        city: '',
        zipCode: '',
        county: '',
        state: 'FL'
      });
      // }

      // Close the modal after confirmation
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error confirming property:', error);
      alert('Error confirming property. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      orderNumber: '',
      parcelAccount: '',
      fullAddress: '',
      county: Object.keys(COUNTIES)[0]
    });
    setParsedData({
      orderNumber: '',
      parcelAccount: '',
      propertyAddress: '',
      houseNumber: '',
      streetName: '',
      city: '',
      zipCode: '',
      county: '',
      state: 'FL'
    });
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className={className}
        disabled={!isChannelActive}
      >
        {!isChannelActive ? 'Channel Inactive' : buttonText}
      </Button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-4/5 max-w-6xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Property Information</h2>
              <p className="text-sm text-red-500">
                <ul>
                  <li>Option 1: Enter the property information on the LEFT column, then click <b>Prepare Data</b> -&gt; <b>Submit</b>
                  </li>
                  <li>
                    OR Option 2: Just fill in the data on the RIGHT column and click on <b>Submit</b>
                  </li>
                </ul></p>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Left Column - Input Form */}
              <div className="w-full md:w-1/2 p-4 border rounded-lg">
                <h2 className="text-xl font-bold mb-4">Raw Data</h2>

                <div className="mb-4">
                  <label htmlFor="orderNumber" className="block mb-2 font-medium">
                    Order Number
                  </label>
                  <input
                    type="text"
                    id="orderNumber"
                    name="orderNumber"
                    value={formData.orderNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-400 rounded"
                    disabled={isProcessing}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="parcelAccount" className="block mb-2 font-medium">
                    Parcel or Account #
                  </label>
                  <input
                    type="text"
                    id="parcelAccount"
                    name="parcelAccount"
                    value={formData.parcelAccount}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-400 rounded"
                    disabled={isProcessing}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="fullAddress" className="block mb-2 font-medium">
                    Full Address
                  </label>
                  <input
                    type="text"
                    id="fullAddress"
                    name="fullAddress"
                    value={formData.fullAddress}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-400 rounded"
                    disabled={isProcessing}
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="county" className="block mb-2 font-medium">
                    County
                  </label>
                  <select
                    id="county"
                    name="county"
                    value={formData.county}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-400 rounded"
                    disabled={isProcessing}
                  >
                    {Object.entries(COUNTIES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-between">
                  <Button
                    onClick={handleCancel}
                    className="bg-gray-500 text-gray-800"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleAnalyze}
                    className="bg-blue-500"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Prepare Data'}
                  </Button>
                </div>
              </div>

              {/* Right Column - Parsed Data Fields */}
              <div className="w-full md:w-1/2 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Parsed Data</h2>
                  <Button
                    onClick={handleSubmit}
                    className="bg-blue-500"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Submit'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label htmlFor="p_orderNumber" className="block mb-1 font-medium text-sm">
                      Order #
                    </label>
                    <input
                      type="text"
                      id="p_orderNumber"
                      name="orderNumber"
                      value={parsedData.orderNumber}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="p_parcelAccount" className="block mb-1 font-medium text-sm">
                      Parcel/Account #
                    </label>
                    <input
                      type="text"
                      id="p_parcelAccount"
                      name="parcelAccount"
                      value={parsedData.parcelAccount}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="p_propertyAddress" className="block mb-1 font-medium text-sm">
                      Property Address
                    </label>
                    <input
                      type="text"
                      id="p_propertyAddress"
                      name="propertyAddress"
                      value={parsedData.propertyAddress}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label htmlFor="p_houseNumber" className="block mb-1 font-medium text-sm">
                      House Number
                    </label>
                    <input
                      type="text"
                      id="p_houseNumber"
                      name="houseNumber"
                      value={parsedData.houseNumber}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label htmlFor="p_streetName" className="block mb-1 font-medium text-sm">
                      Street Name
                    </label>
                    <input
                      type="text"
                      id="p_streetName"
                      name="streetName"
                      value={parsedData.streetName}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label htmlFor="p_city" className="block mb-1 font-medium text-sm">
                      City
                    </label>
                    <input
                      type="text"
                      id="p_city"
                      name="city"
                      value={parsedData.city}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label htmlFor="p_zipCode" className="block mb-1 font-medium text-sm">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      id="p_zipCode"
                      name="zipCode"
                      value={parsedData.zipCode}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label htmlFor="p_county" className="block mb-1 font-medium text-sm">
                      County
                    </label>
                    <select
                      id="p_county"
                      name="county"
                      value={parsedData.county}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={isProcessing}
                    >
                      {Object.entries(COUNTIES).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="p_state" className="block mb-1 font-medium text-sm">
                      State
                    </label>
                    <input
                      type="text"
                      id="p_state"
                      name="state"
                      value={parsedData.state}
                      onChange={handleParsedInputChange}
                      className="w-full p-1.5 border border-gray-400 rounded text-sm"
                      disabled={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 