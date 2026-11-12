import type { CabinSeat } from '../scene/cabinPassengers';

/** Thirty measured economy seats; the protagonist's whole row stays vacant.
 * Uniform metre-scale calibration preserves the supplied pose and proportions.
 * Cushion contact is within 4 mm and shoe soles within 5 mm of the floor. */
export const CABIN_PASSENGER_SEATS: readonly CabinSeat[] = [
  { id: 'passenger-seat-01', sourceId: 'passageiro_01', row: 2, scale: .90, position: { x: 55.413692, y: 0.01892, z: -1.16276 } },
  { id: 'passenger-seat-02', sourceId: 'passageiro_02', row: 2, scale: .90, position: { x: 60.340046, y: 0.01892, z: -1.16276 } },
  { id: 'passenger-seat-03', sourceId: 'passageiro_03', row: 2, scale: .90, position: { x: 57.845523, y: 0.01892, z: -1.143 } },
  { id: 'passenger-seat-04', sourceId: 'passageiro_04', row: 2, scale: .90, position: { x: 58.74832, y: 0.01892, z: -1.077399 } },
  { id: 'passenger-seat-05', sourceId: 'passageiro_05', row: 3, scale: .90, position: { x: 55.413692, y: 0.01892, z: -0.258042 } },
  { id: 'passenger-seat-06', sourceId: 'passageiro_06', row: 3, scale: .90, position: { x: 60.340046, y: 0.01892, z: -0.258042 } },
  { id: 'passenger-seat-07', sourceId: 'passageiro_07', row: 3, scale: .90, position: { x: 57.845523, y: 0.01892, z: -0.2031 } },
  { id: 'passenger-seat-08', sourceId: 'passageiro_08', row: 3, scale: .90, position: { x: 58.74832, y: 0.01892, z: -0.1474 } },
  { id: 'passenger-seat-09', sourceId: 'passageiro_09', row: 4, scale: .90, position: { x: 55.413692, y: 0.01892, z: 0.605759 } },
  { id: 'passenger-seat-10', sourceId: 'passageiro_10', row: 4, scale: .90, position: { x: 60.340046, y: 0.01892, z: 0.605759 } },
  { id: 'passenger-seat-11', sourceId: 'passageiro_11', row: 4, scale: .90, position: { x: 57.845523, y: 0.01892, z: 0.6607 } },
  { id: 'passenger-seat-12', sourceId: 'passageiro_12', row: 4, scale: .90, position: { x: 58.74832, y: 0.01892, z: 0.7826 } },
  { id: 'passenger-seat-13', sourceId: 'passageiro_13', row: 5, scale: .90, position: { x: 55.413692, y: 0.01892, z: 1.413498 } },
  { id: 'passenger-seat-14', sourceId: 'passageiro_14', row: 5, scale: .90, position: { x: 60.340046, y: 0.01892, z: 1.413498 } },
  { id: 'passenger-seat-15', sourceId: 'passageiro_15', row: 5, scale: .90, position: { x: 57.845523, y: 0.01892, z: 1.468439 } },
  { id: 'passenger-seat-16', sourceId: 'passageiro_16', row: 5, scale: .90, position: { x: 58.74832, y: 0.01892, z: 1.712601 } },
  { id: 'passenger-seat-17', sourceId: 'passageiro_17', row: 6, scale: .90, position: { x: 55.413692, y: 0.01892, z: 2.407665 } },
  { id: 'passenger-seat-18', sourceId: 'passageiro_18', row: 6, scale: .90, position: { x: 60.340046, y: 0.01892, z: 2.407665 } },
  { id: 'passenger-seat-19', sourceId: 'passageiro_19', row: 6, scale: .90, position: { x: 57.845523, y: 0.01892, z: 2.462606 } },
  { id: 'passenger-seat-20', sourceId: 'passageiro_20', row: 6, scale: .90, position: { x: 58.74832, y: 0.01892, z: 2.642601 } },
  { id: 'passenger-seat-21', sourceId: 'passageiro_21', row: 7, scale: .90, position: { x: 55.413692, y: 0.01892, z: 3.347565 } },
  { id: 'passenger-seat-22', sourceId: 'passageiro_22', row: 7, scale: .90, position: { x: 60.340046, y: 0.01892, z: 3.347565 } },
  { id: 'passenger-seat-23', sourceId: 'passageiro_23', row: 7, scale: .90, position: { x: 58.74832, y: 0.01892, z: 3.572602 } },
  { id: 'passenger-seat-24', sourceId: 'passageiro_24', row: 8, scale: .90, position: { x: 55.413692, y: 0.01892, z: 4.211365 } },
  { id: 'passenger-seat-25', sourceId: 'passageiro_25', row: 8, scale: .90, position: { x: 60.340046, y: 0.01892, z: 4.211365 } },
  { id: 'passenger-seat-26', sourceId: 'passageiro_26', row: 9, scale: .90, position: { x: 55.413692, y: 0.01892, z: 5.019104 } },
  { id: 'passenger-seat-27', sourceId: 'passageiro_27', row: 9, scale: .90, position: { x: 60.340046, y: 0.01892, z: 5.019104 } },
  { id: 'passenger-seat-28', sourceId: 'passageiro_28', row: 1, scale: .90, position: { x: 55.413692, y: 0.01892, z: -3.15584 } },
  { id: 'passenger-seat-29', sourceId: 'passageiro_29', row: 1, scale: .90, position: { x: 57.845523, y: 0.01892, z: -2.944906 } },
  { id: 'passenger-seat-30', sourceId: 'passageiro_30', row: 1, scale: .90, position: { x: 60.340046, y: 0.01892, z: -2.947024 } },
];
