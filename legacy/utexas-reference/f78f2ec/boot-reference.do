expect "BOOT>" send "\r"; continue
expect "Why reload:" send  "sa\r"; continue
expect "Date:" send  "03-19-86\r"; continue
expect "Time:" send  "0000\r"; continue
expect "Startup option:" send  "quick\r"; continue
expect "%TTY STOMPER - Starting" send "\3"; continue
expect "\r\n*" continue
expect "\r\n." continue
expect "\r\n." continue

expect "\r\n." send "assign gam: dskb:[5,30]\r"; continue
