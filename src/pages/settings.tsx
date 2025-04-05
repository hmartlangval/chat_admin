import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';

const Settings = () => {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-xl font-medium text-gray-900">Settings</h1>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* General Settings Section */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">General Settings</h2>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500">General application settings will appear here.</p>
                  </div>
                </div>

                {/* Security Settings Section */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Security</h2>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500">Security and access control settings will appear here.</p>
                  </div>
                </div>

                {/* API Settings Section */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h2>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500">API keys and integration settings will appear here.</p>
                  </div>
                </div>

                {/* System Settings Section */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">System</h2>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500">System configuration and maintenance settings will appear here.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings; 