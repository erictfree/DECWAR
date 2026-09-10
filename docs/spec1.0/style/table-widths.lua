-- Give Markdown tables bounded columns so long prose wraps in the draft PDF.
function Table(table)
  local count = #table.colspecs
  for _, column in ipairs(table.colspecs) do
    column[2] = 1 / count
  end
  return table
end
