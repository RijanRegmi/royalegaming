export function getUserAvatarColor(key: string): string {
  if (!key) return '#128C7E';

  const colors = [
    '#128C7E',
    '#075E54',
    '#34B7F1',
    '#25D366',
    '#E91E63',
    '#FF9800',
    '#9C27B0',
    '#673AB7',
    '#F44336',
    '#009688',
    '#3F51B5',
    '#008F6D'
  ];

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
