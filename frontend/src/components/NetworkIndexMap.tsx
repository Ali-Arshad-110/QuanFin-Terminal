
import React from 'react';
import IndicesExchangeView from './IndicesExchangeView';

interface NetworkIndexMapProps {
    onNavigate?: (view: string) => void;
}

const NetworkIndexMap: React.FC<NetworkIndexMapProps> = ({ onNavigate }) => {
    return (
        <div className="w-full h-[calc(100vh-64px)] bg-background overflow-hidden">
            <IndicesExchangeView onNavigate={onNavigate} />
        </div>
    );
};

export default NetworkIndexMap;
