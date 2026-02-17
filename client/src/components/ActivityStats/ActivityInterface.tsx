export interface Activity {
  key: string;
  name: string;
  icon: string;
  group: string;
  groupIcon: string;
}

export interface ActivityRowData {
  activity_type?: string;
  duration?: string | number;
  from?: string;
  to?: string;
  comment?: string;
  [key: string]: any;
}

export interface Group {
  key: string;
  name: string;
  icon: string;
}
