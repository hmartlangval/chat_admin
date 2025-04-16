import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Head from 'next/head';
import { NextPage } from 'next';
import { useLoading, withLoading } from '@/contexts/LoadingContext';
import axios from 'axios';

type QueueRecord = {
    _id: string;
    refId: string;
    status: string;
    queue: string;
    assignee?: string;
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
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; record: QueueRecord | null }>({
        visible: false,
        x: 0,
        y: 0,
        record: null
    });
    const contextMenuRef = useRef<HTMLDivElement>(null);

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

    const handleContextMenu = (e: React.MouseEvent, record: QueueRecord) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            record
        });
    };

    const handleRetry = async (record: QueueRecord) => {
        try {
            const unaccepted = ['in_progress']
            if (unaccepted.includes(record.status))
            {
                alert('You cannot retry the task in its current state.')
                return;
            }

            // update the record to queued state
            const up = await axios.put(`/api/dynamic/tasks/${record._id}`, {
                status: 'queued'
            })
            
            if(record.assignee && record.refId) {
                const resp = await axios.get(`/api/aido-order/${record.refId}`).then(r => r.data)
                const extracted_data = resp?.record?.extracted_data;
                if (extracted_data) {
                    const d = {...extracted_data, ...{ action_type: 'start', retry_id: record._id }}
                    const response = await axios.post(`/api/v2/sendMessage?channelId=general`, {
                        content: `@${record.assignee} Retry [json]${JSON.stringify(d)}[/json]`
                    });
                }
            }

            // Refresh the queue data
            fetchQueueData(pagination.currentPage);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while retrying the task');
            console.error('Error retrying task:', err);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Task ID</th>
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Status</th>
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Queue</th>
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Created</th>
                                            <th className="px-6 py-3 text-left text-gray-900 font-medium">Assignee</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queueData.map((record) => (
                                            <tr 
                                                key={record._id} 
                                                className={`border-b border-gray-200 ${
                                                    contextMenu.visible && contextMenu.record?._id === record._id 
                                                        ? 'bg-blue-50' 
                                                        : 'hover:bg-gray-50'
                                                }`}
                                                onContextMenu={(e) => handleContextMenu(e, record)}
                                            >
                                                <td className="px-6 py-3 text-gray-900">
                                                    {record.order_info?.extracted_data?.order_number || '-'}
                                                </td>
                                                <td className="px-6 py-3 text-gray-900">{record._id}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        record.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
                                                        record.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-900">{record.queue}</td>
                                                <td className="px-6 py-3 text-gray-900">
                                                    {new Date(record.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-3 text-gray-900">{record.assignee}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {contextMenu.visible && contextMenu.record && (
                                <div
                                    ref={contextMenuRef}
                                    className="fixed bg-white shadow-lg rounded-md py-1 z-50"
                                    style={{
                                        top: contextMenu.y,
                                        left: contextMenu.x
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            handleRetry(contextMenu.record!);
                                            setContextMenu(prev => ({ ...prev, visible: false }));
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

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


