import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Head from 'next/head';
import { NextPage } from 'next';
import { useLoading, withLoading } from '@/contexts/LoadingContext';

type QueueRecord = {
    _id: string;
    refId: string;
    status: string;
    queue: string;
    order_info?: {
        extracted_data?: {
            order_number?: string;
        }
    };
    createdAt: string;
};

type PaginationInfo = {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
};

const QueuePage: NextPage = () => {
    const [queueData, setQueueData] = useState<QueueRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        status: '',
        orderNumber: '',
        queue: ''
    });
    const [pagination, setPagination] = useState<PaginationInfo>({
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        limit: 10
    });
    const { startLoading, stopLoading } = useLoading();

    const fetchQueueData = async (page: number = 1) => {
        return withLoading(async () => {
            try {
                const params = new URLSearchParams();
                params.append('page', page.toString());
                params.append('limit', pagination.limit.toString());

                if (filters.status) params.append('status', filters.status);
                if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);
                if (filters.queue) params.append('queue', filters.queue);

                const response = await fetch(`/api/v2/queue?${params.toString()}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch queue data');
                }
                const data = await response.json();
                setQueueData(data.records);
                setPagination(prev => ({
                    ...prev,
                    ...data.pagination
                }));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Error fetching queue data:', err);
            }
        }, { startLoading, stopLoading });
    };

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    useEffect(() => {
        fetchQueueData(1);
    }, [filters, pagination.limit]);

    useEffect(() => {
        fetchQueueData();
    }, []);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchQueueData(newPage);
        }
    };

    const handleLimitChange = (newLimit: number) => {
        setPagination(prev => ({
            ...prev,
            currentPage: 1,
            limit: newLimit
        }));
        fetchQueueData();
    };

    return (
        <AdminLayout>
            <div className="h-[calc(100vh-3rem)] flex flex-col p-6">
                <div className="flex-1 bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-medium text-gray-900">Queue Management</h1>
                            <button
                                onClick={() => fetchQueueData(pagination.currentPage)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                title="Refresh data"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center space-x-4">

                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-500">Order #:</label>
                                <input
                                    type="text"
                                    value={filters.orderNumber}
                                    onChange={(e) => handleFilterChange('orderNumber', e.target.value)}
                                    placeholder="Search order number"
                                    className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-500">Queue:</label>
                                <select
                                    value={filters.queue}
                                    onChange={(e) => handleFilterChange('queue', e.target.value)}
                                    className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">All</option>
                                    <option value="fileprep_tax">FilePrep Tax</option>
                                    <option value="fileprep_property">FilePrep Property</option>
                                </select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-500">Status:</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">All</option>
                                    <option value="queued">Queued</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>                            
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 text-center text-red-500">{error}</div>
                    )}

                    {!error && (
                        <>
                            <div className="overflow-x-auto relative">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Order Number</th>
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Reference ID</th>
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Status</th>
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Queue</th>
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queueData.map((record) => (
                                            <tr key={record._id} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="px-6 py-3 text-gray-900">
                                                    {record.order_info?.extracted_data?.order_number || '-'}
                                                </td>
                                                <td className="px-6 py-3 text-gray-900">{record.refId}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${record.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
                                                            record.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-900">{record.queue}</td>
                                                <td className="px-6 py-3 text-gray-900">
                                                    {new Date(record.createdAt).toLocaleString()}
                                                    {/* {new Date(record.createdAt).toLocaleTimeString()} */}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between px-6 py-3 border-t">
                                <div className="flex items-center space-x-4">
                                    <div className="text-sm text-gray-500">
                                        Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)} of {pagination.totalRecords} entries
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-500">Rows per page:</span>
                                        <select
                                            value={pagination.limit}
                                            onChange={(e) => handleLimitChange(Number(e.target.value))}
                                            className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={pagination.currentPage === 1}
                                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="First page"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                        disabled={pagination.currentPage === 1}
                                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Previous page"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <span className="text-sm text-gray-500">
                                        Page {pagination.currentPage} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                        disabled={pagination.currentPage === pagination.totalPages}
                                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Next page"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.totalPages)}
                                        disabled={pagination.currentPage === pagination.totalPages}
                                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Last page"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default QueuePage;


