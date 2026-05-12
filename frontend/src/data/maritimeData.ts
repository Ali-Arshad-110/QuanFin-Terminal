export interface MaritimePort {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    trafficMMT: number; // Million Metric Tonnes (FY 2025-26 Estimate)
    yearOnYear: number; // % Change
    status: 'High Density' | 'Normal' | 'Expansion';
    type: 'Major Port';
    description: string;
}

export const MAJOR_PORTS: MaritimePort[] = [
    {
        id: 'dpa',
        name: 'Deendayal Port (Kandla)',
        latitude: 23.01,
        longitude: 70.13,
        city: 'Kandla',
        state: 'Gujarat',
        trafficMMT: 145.42,
        yearOnYear: 8.4,
        status: 'High Density',
        type: 'Major Port',
        description: 'India\'s largest port by cargo volume handled. Hub for petroleum and dry bulk.'
    },
    {
        id: 'mpa',
        name: 'Mumbai Port Authority',
        latitude: 18.9447,
        longitude: 72.8258,
        city: 'Mumbai',
        state: 'Maharashtra',
        trafficMMT: 65.20,
        yearOnYear: 4.2,
        status: 'Normal',
        type: 'Major Port',
        description: 'Historic gateway port. Multi-disciplinary cargo hub.'
    },
    {
        id: 'jnpa',
        name: 'Jawaharlal Nehru Port (JNPT)',
        latitude: 18.9453,
        longitude: 72.9400,
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        trafficMMT: 85.12,
        yearOnYear: 9.1,
        status: 'High Density',
        type: 'Major Port',
        description: 'Largest container port in India. Handles ~50% of the country\'s containerized cargo.'
    },
    {
        id: 'mopt',
        name: 'Mormugao Port Authority',
        latitude: 15.4167,
        longitude: 73.7833,
        city: 'Mormugao',
        state: 'Goa',
        trafficMMT: 20.15,
        yearOnYear: 2.5,
        status: 'Normal',
        type: 'Major Port',
        description: 'Major iron ore export hub of India.'
    },
    {
        id: 'nmpt',
        name: 'New Mangalore Port Authority',
        latitude: 12.9167,
        longitude: 74.8000,
        city: 'Mangaluru',
        state: 'Karnataka',
        trafficMMT: 45.60,
        yearOnYear: 5.8,
        status: 'Expansion',
        type: 'Major Port',
        description: 'Deepest inner-harbor on the west coast.'
    },
    {
        id: 'cpt',
        name: 'Cochin Port Authority',
        latitude: 9.9500,
        longitude: 76.2667,
        city: 'Kochi',
        state: 'Kerala',
        trafficMMT: 38.25,
        yearOnYear: 6.2,
        status: 'Normal',
        type: 'Major Port',
        description: 'Strategic international transshipment terminal.'
    },
    {
        id: 'vocpa',
        name: 'V.O. Chidambaranar Port (Tuticorin)',
        latitude: 8.7500,
        longitude: 78.2000,
        city: 'Thoothukudi',
        state: 'Tamil Nadu',
        trafficMMT: 42.10,
        yearOnYear: 7.4,
        status: 'Normal',
        type: 'Major Port',
        description: 'Key trade gateway for South India and Southeast Asia.'
    },
    {
        id: 'chpa',
        name: 'Chennai Port Authority',
        latitude: 13.0844,
        longitude: 80.2900,
        city: 'Chennai',
        state: 'Tamil Nadu',
        trafficMMT: 52.40,
        yearOnYear: 3.8,
        status: 'Normal',
        type: 'Major Port',
        description: 'One of the oldest artificial ports in India.'
    },
    {
        id: 'kpl',
        name: 'Kamarajar Port (Ennore)',
        latitude: 13.2517,
        longitude: 80.3269,
        city: 'Ennore',
        state: 'Tamil Nadu',
        trafficMMT: 48.55,
        yearOnYear: 12.5,
        status: 'Expansion',
        type: 'Major Port',
        description: 'First corporatized port. Fast growing energy and container hub.'
    },
    {
        id: 'vpa',
        name: 'Visakhapatnam Port Authority',
        latitude: 17.6833,
        longitude: 83.3000,
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        trafficMMT: 82.30,
        yearOnYear: 10.2,
        status: 'High Density',
        type: 'Major Port',
        description: 'Strategic energy and metal export/import hub on the East Coast.'
    },
    {
        id: 'ppa',
        name: 'Paradip Port Authority',
        latitude: 20.2667,
        longitude: 86.6667,
        city: 'Paradip',
        state: 'Odisha',
        trafficMMT: 132.50,
        yearOnYear: 11.4,
        status: 'High Density',
        type: 'Major Port',
        description: 'Major hub for iron ore and coal handling on the East Coast.'
    },
    {
        id: 'smmpa',
        name: 'Syama Prasad Mookerjee Port (Kolkata/Haldia)',
        latitude: 22.5461,
        longitude: 88.3147,
        city: 'Kolkata',
        state: 'West Bengal',
        trafficMMT: 70.10,
        yearOnYear: 5.2,
        status: 'Normal',
        type: 'Major Port',
        description: 'Strategic riverine port gateway for Eastern India and North-East.'
    },
    {
        id: 'pbpa',
        name: 'Port Blair Port Authority',
        latitude: 11.6667,
        longitude: 92.7500,
        city: 'Port Blair',
        state: 'Andaman & Nicobar',
        trafficMMT: 5.20,
        yearOnYear: 1.5,
        status: 'Normal',
        type: 'Major Port',
        description: 'Strategic maritime outpost and transshipment hub in the Bay of Bengal.'
    }
];

export interface TradeFlow {
    from: string;
    to: string;
    fromCoords: [number, number];
    toCoords: [number, number];
    volume: number;
    commodity: 'POL' | 'Coal' | 'Container' | 'Iron Ore';
}

export const GLOBAL_FLOWS: TradeFlow[] = [
    { from: 'JNPA', to: 'Singapore', fromCoords: [18.9453, 72.9400], toCoords: [1.3521, 103.8198], volume: 85, commodity: 'Container' },
    { from: 'DPA', to: 'Sharjah', fromCoords: [23.01, 70.13], toCoords: [25.3573, 55.4033], volume: 120, commodity: 'POL' },
    { from: 'PPA', to: 'Shanghai', fromCoords: [20.2667, 86.6667], toCoords: [31.2304, 121.4737], volume: 95, commodity: 'Iron Ore' },
    { from: 'CHPA', to: 'Port Kelang', fromCoords: [13.0844, 80.2900], toCoords: [3.0035, 101.3912], volume: 45, commodity: 'Container' }
];
